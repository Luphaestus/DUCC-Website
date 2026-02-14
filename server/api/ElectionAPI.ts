// server/api/ElectionAPI.ts

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { DatabaseWrapper } from '../db/db.js';
import checkAuthentication from '../misc/authentication.js';
import Logger from '../misc/Logger.js';
import { Permissions } from '../misc/permissions.js';
import ElectionDB from '../db/electionDB.js';
import ExecDB from '../db/execDB.js'; // Needed for role transfer logic

export default class ElectionAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        // --- Admin/President Endpoints (requires 'election.manage' permission) ---

        /**
         * Create a new election.
         * @param {object} req.body - Election details (title, description, start_date, end_date, voting_type, etc.).
         */
        this.app.post('/api/admin/elections', { preHandler: [checkAuthentication('election.manage')] }, async (req: any, reply) => {
            try {
                // Enforce "one active election at a time" rule
                const allElectionsRes = await ElectionDB.getAllElections(this.db);
                if (!allElectionsRes.isError()) {
                    const activeElection = allElectionsRes.getData().find((e: any) => !['setup', 'completed'].includes(e.phase));
                    if (activeElection) {
                        return reply.status(400).send({ message: `Cannot create a new election because "${activeElection.title}" is still active. Please complete it first.` });
                    }
                }

                const userId = req.user.id;
                const status = await ElectionDB.createElection(this.db, { ...req.body, managed_by_user_id: userId, voting_type: req.body.voting_type });
                if (status.isError()) return status.getResponse(reply);
                return reply.status(201).send(status.getData());
            } catch (e: any) {
                Logger.error('Failed to create election', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        /**
         * Update an election's details or phase.
         * @param {string} req.params.id - Election ID.
         * @param {object} req.body - Fields to update.
         */
        this.app.put('/api/admin/elections/:id', { preHandler: [checkAuthentication('election.manage')] }, async (req: any, reply) => {
            try {
                const electionId = parseInt(req.params.id);
                if (isNaN(electionId)) return reply.status(400).send({ message: 'Invalid election ID.' });

                // Prevent reopening after results calculated or closed
                if (req.body.phase && ['setup', 'nominations', 'voting'].includes(req.body.phase)) {
                    const electionRes = await ElectionDB.getElectionById(this.db, electionId);
                    if (!electionRes.isError()) {
                        const currentPhase = electionRes.getData().phase;
                        if (['results_revealed', 'roles_transferred', 'closed', 'completed'].includes(currentPhase)) {
                            return reply.status(400).send({ message: 'Cannot reopen an election after it has been closed or results revealed.' });
                        }
                    }
                }

                // Enforce "one active election at a time" rule
                if (req.body.phase && !['setup', 'completed'].includes(req.body.phase)) {
                    const allElectionsRes = await ElectionDB.getAllElections(this.db);
                    if (!allElectionsRes.isError()) {
                        const activeElection = allElectionsRes.getData().find((e: any) => 
                            e.id !== electionId && !['setup', 'completed'].includes(e.phase)
                        );
                        if (activeElection) {
                            return reply.status(400).send({ message: `Cannot activate this election because "${activeElection.title}" is already active.` });
                        }
                    }
                }

                const status = await ElectionDB.updateElection(this.db, electionId, req.body);
                if (status.isError()) return status.getResponse(reply);
                return reply.status(200).send(status.getData() || { message: status.message });
            } catch (e: any) {
                Logger.error('Failed to update election', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        /**
         * Delete an election.
         * @param {string} req.params.id - Election ID.
         */
        this.app.delete('/api/admin/elections/:id', { preHandler: [checkAuthentication('election.manage')] }, async (req: any, reply) => {
            try {
                const electionId = parseInt(req.params.id);
                if (isNaN(electionId)) return reply.status(400).send({ message: 'Invalid election ID.' });

                const status = await ElectionDB.deleteElection(this.db, electionId);
                if (status.isError()) return status.getResponse(reply);
                return reply.status(200).send({ message: status.message });
            } catch (e: any) {
                Logger.error('Failed to delete election', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        /**
         * Get all elections (Admin view).
         */
        this.app.get('/api/admin/elections', { preHandler: [checkAuthentication('election.manage')] }, async (req: any, reply) => {
            try {
                const status = await ElectionDB.getAllElections(this.db);
                if (status.isError()) return status.getResponse(reply);
                return reply.status(200).send({ elections: status.getData() });
            } catch (e: any) {
                Logger.error('Failed to get all elections (admin)', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        /**
         * Get specific election (Admin view).
         * @param {string} req.params.id - Election ID.
         */
        this.app.get('/api/admin/elections/:id', { preHandler: [checkAuthentication('election.manage')] }, async (req: any, reply) => {
            try {
                const electionId = parseInt(req.params.id);
                if (isNaN(electionId)) return reply.status(400).send({ message: 'Invalid election ID.' });

                const status = await ElectionDB.getElectionById(this.db, electionId);
                if (status.isError()) return status.getResponse(reply);
                
                const election = status.getData();
                return reply.status(200).send({ election });
            } catch (e: any) {
                Logger.error('Failed to get election (admin)', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        /**
         * Add a role to an election.
         * @param {string} req.params.electionId - Election ID.
         * @param {object} req.body - { role_id: number, max_winners: number }.
         */
        this.app.post('/api/admin/elections/:electionId/roles', { preHandler: [checkAuthentication('election.manage')] }, async (req: any, reply) => {
            try {
                const electionId = parseInt(req.params.electionId);
                const { role_id, max_winners } = req.body;
                if (isNaN(electionId) || isNaN(role_id)) return reply.status(400).send({ message: 'Invalid IDs.' });

                const status = await ElectionDB.addElectionRole(this.db, { election_id: electionId, role_id, max_winners });
                if (status.isError()) return status.getResponse(reply);
                return reply.status(201).send(status.getData());
            } catch (e: any) {
                Logger.error('Failed to add election role', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        /**
         * Get all roles for an election (Admin view).
         * @param {string} req.params.electionId - Election ID.
         */
        this.app.get('/api/admin/elections/:electionId/roles', { preHandler: [checkAuthentication('election.manage')] }, async (req: any, reply) => {
            try {
                const electionId = parseInt(req.params.electionId);
                if (isNaN(electionId)) return reply.status(400).send({ message: 'Invalid election ID.' });

                const status = await ElectionDB.getElectionRoles(this.db, electionId);
                if (status.isError()) return status.getResponse(reply);
                return reply.status(200).send({ roles: status.getData() });
            } catch (e: any) {
                Logger.error('Failed to get election roles (admin)', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        /**
         * Update an election role (e.g., max_winners).
         * @param {string} req.params.electionRoleId - Election Role ID.
         * @param {object} req.body - { max_winners: number }.
         */
        this.app.put('/api/admin/elections/:electionId/roles/:electionRoleId', { preHandler: [checkAuthentication('election.manage')] }, async (req: any, reply) => {
            try {
                const electionRoleId = parseInt(req.params.electionRoleId);
                const { max_winners } = req.body;
                if (isNaN(electionRoleId)) return reply.status(400).send({ message: 'Invalid ID.' });

                const status = await ElectionDB.updateElectionRole(this.db, electionRoleId, { max_winners });
                if (status.isError()) return status.getResponse(reply);
                return reply.status(200).send({ message: status.message });
            } catch (e: any) {
                Logger.error('Failed to update election role', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        /**
         * Remove a role from an election.
         * @param {string} req.params.electionId - Election ID.
         * @param {string} req.params.electionRoleId - Election Role ID.
         */
        this.app.delete('/api/admin/elections/:electionId/roles/:electionRoleId', { preHandler: [checkAuthentication('election.manage')] }, async (req: any, reply) => {
            try {
                const electionId = parseInt(req.params.electionId); // For validation, not used in DB call
                const electionRoleId = parseInt(req.params.electionRoleId);
                if (isNaN(electionId) || isNaN(electionRoleId)) return reply.status(400).send({ message: 'Invalid IDs.' });

                const status = await ElectionDB.removeElectionRole(this.db, electionRoleId);
                if (status.isError()) return status.getResponse(reply);
                return reply.status(200).send({ message: status.message });
            } catch (e: any) {
                Logger.error('Failed to remove election role', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        /**
         * Approve a nomination.
         * @param {string} req.params.nominationId - Nomination ID.
         */
        this.app.put('/api/admin/nominations/:nominationId/approve', { preHandler: [checkAuthentication('election.manage')] }, async (req: any, reply) => {
            try {
                const nominationId = parseInt(req.params.nominationId);
                const approverUserId = req.user.id;
                if (isNaN(nominationId)) return reply.status(400).send({ message: 'Invalid nomination ID.' });

                const status = await ElectionDB.approveNomination(this.db, nominationId, approverUserId);
                if (status.isError()) return status.getResponse(reply);
                return reply.status(200).send({ message: status.message });
            } catch (e: any) {
                Logger.error('Failed to approve nomination', e);
                return reply.status(500).send({ error: e.message });
            }
        });
        
                /**
                 * Update local votes count for a nomination (for in-person voting).
                 * @param {string} req.params.nominationId - Nomination ID.
                 * @param {object} req.body - { local_votes_count: number }.
                 */
                this.app.put('/api/admin/nominations/:nominationId/local-votes', { preHandler: [checkAuthentication('election.manage')] }, async (req: any, reply) => {
                    try {
                        const nominationId = parseInt(req.params.nominationId);
                        const { local_votes_count } = req.body;
                        if (isNaN(nominationId) || typeof local_votes_count !== 'number' || local_votes_count < 0) {
                            return reply.status(400).send({ message: 'Invalid nomination ID or local_votes_count.' });
                        }
        
                        const status = await ElectionDB.updateNominationLocalVotes(this.db, nominationId, local_votes_count);
                        if (status.isError()) return status.getResponse(reply);
                        return reply.status(200).send({ message: status.message });
                    } catch (e: any) {
                        Logger.error('Failed to update nomination local votes', e);
                        return reply.status(500).send({ error: e.message });
                    }
                });
                
                /**
                 * Get election results (after voting closes).
                 * @param {string} req.params.id - Election ID.
                 */
                this.app.get('/api/admin/elections/:id/results', { preHandler: [checkAuthentication('election.manage')] }, async (req: any, reply) => {
                    try {
                        const electionId = parseInt(req.params.id);
                        if (isNaN(electionId)) return reply.status(400).send({ message: 'Invalid election ID.' });
                const electionRes = await ElectionDB.getElectionById(this.db, electionId);
                if (electionRes.isError()) return electionRes.getResponse(reply);
                const election = electionRes.getData();

                if (election.phase !== 'closed' && election.phase !== 'results_revealed' && election.phase !== 'roles_transferred' && election.phase !== 'completed') {
                    return reply.status(403).send({ message: 'Results can only be viewed after voting has closed.' });
                }

                // Recalculate results on demand if not already done, or just fetch
                const calculateStatus = await ElectionDB.calculateResults(this.db, electionId);
                if (calculateStatus.isError()) return calculateStatus.getResponse(reply);

                const rolesRes = await ElectionDB.getElectionRoles(this.db, electionId);
                if (rolesRes.isError()) return rolesRes.getResponse(reply);
                const roles = rolesRes.getData();

                const results: any[] = [];
                for (const role of roles) {
                    const nominationsRes = await ElectionDB.getNominationsForRole(this.db, role.id);
                    if (nominationsRes.isError()) continue;
                    results.push({
                        role: role,
                        nominations: nominationsRes.getData()
                    });
                }
                return reply.send({ results });

            } catch (e: any) {
                Logger.error('Failed to get election results', e);
                return reply.status(500).send({ error: e.message });
            }
        });
        
        /**
         * Transfer roles based on election results.
         * @param {string} req.params.id - Election ID.
         */
        this.app.post('/api/admin/elections/:id/transfer-roles', { preHandler: [checkAuthentication('election.manage')] }, async (req: any, reply) => {
            try {
                const electionId = parseInt(req.params.id);
                if (isNaN(electionId)) return reply.status(400).send({ message: 'Invalid election ID.' });

                const status = await ElectionDB.transferRoles(this.db, electionId, req.user.id);
                if (status.isError()) return status.getResponse(reply);
                return reply.status(200).send({ message: status.message });
            } catch (e: any) {
                Logger.error('Failed to transfer roles', e);
                return reply.status(500).send({ error: e.message });
            }
        });


        // --- User Endpoints (requires authentication, some require 'is_member') ---

        /**
         * Get the current active election for user actions (nomination/voting).
         */
        this.app.get('/api/elections/current', { preHandler: [checkAuthentication()] }, async (req: any, reply) => {
            try {
                const electionsRes = await ElectionDB.getAllElections(this.db);
                if (electionsRes.isError()) return electionsRes.getResponse(reply);
                const allElections = electionsRes.getData();

                // Find the most recent election that is not in setup
                const currentElection = allElections.find((e: any) => !['setup'].includes(e.phase));

                if (!currentElection) {
                    return reply.status(404).send({ message: 'No active or recent elections found.' });
                }
                
                // Get roles for the election
                const rolesRes = await ElectionDB.getElectionRoles(this.db, currentElection.id);
                if (rolesRes.isError()) return rolesRes.getResponse(reply);
                const roles = rolesRes.getData();

                // Get nominations
                const nominationsByRole: { [key: number]: any[] } = {};
                for (const role of roles) {
                    const nomsRes = await ElectionDB.getNominationsForRole(this.db, role.id);
                    if (!nomsRes.isError()) {
                        let noms = nomsRes.getData();
                        // Hide winners/votes if results are not revealed yet
                        if (!['results_revealed', 'roles_transferred', 'completed'].includes(currentElection.phase)) {
                            noms = noms.map((n: any) => {
                                const { is_winner, votes_received, ...rest } = n;
                                return { ...rest, is_winner: 0, votes_received: 0 };
                            });
                        }
                        // Filter approved nominations unless results are shown
                        if (!['results_revealed', 'roles_transferred', 'closed', 'completed'].includes(currentElection.phase)) {
                            noms = noms.filter((n: any) => n.is_approved);
                        }
                        nominationsByRole[role.id] = noms;
                    }
                }

                // Check if user has already nominated/voted
                let userNominations: any[] = [];
                let userVotes: any[] = [];
                if (req.user && req.user.id) {
                    userNominations = await this.db.all('SELECT n.election_role_id, n.manifesto_file_id FROM nominations n WHERE n.user_id = ? AND n.election_role_id IN (SELECT id FROM election_roles WHERE election_id = ?)', [req.user.id, currentElection.id]);
                    userVotes = await this.db.all('SELECT v.election_role_id FROM votes v WHERE v.voter_user_id = ? AND v.election_role_id IN (SELECT id FROM election_roles WHERE election_id = ?)', [req.user.id, currentElection.id]);
                }

                return reply.send({ 
                    data: {
                        election: currentElection, 
                        roles, 
                        nominations: nominationsByRole,
                        user_nominations: userNominations,
                        user_has_voted: userVotes.map(v => v.election_role_id)
                    }
                });

            } catch (e: any) {
                Logger.error('Failed to get current election', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        /**
         * User nominates for a role or updates their existing nomination.
         * @param {string} req.params.electionId - Election ID.
         * @param {object} req.body - { election_role_id: number, manifesto_file_id: number }.
         */
        this.app.post('/api/elections/:electionId/nominate', { preHandler: [checkAuthentication('is_member')] }, async (req: any, reply) => {
            try {
                const electionId = parseInt(req.params.electionId);
                const userId = req.user.id;
                const { election_role_id, manifesto_file_id } = req.body;
                if (isNaN(electionId) || isNaN(election_role_id)) return reply.status(400).send({ message: 'Invalid IDs.' });
                
                if (!manifesto_file_id) {
                    return reply.status(400).send({ message: 'A manifesto is required to nominate yourself.' });
                }

                const electionRes = await ElectionDB.getElectionById(this.db, electionId);
                if (electionRes.isError()) return electionRes.getResponse(reply);
                const election = electionRes.getData();
                if (election.phase !== 'nominations') {
                    return reply.status(403).send({ message: 'Nominations are not open for this election.' });
                }

                // Check if already nominated
                const existing = await this.db.get('SELECT id FROM nominations WHERE election_role_id = ? AND user_id = ?', [election_role_id, userId]);
                
                if (existing) {
                    const status = await ElectionDB.updateNomination(this.db, election_role_id, userId, manifesto_file_id);
                    if (status.isError()) return status.getResponse(reply);
                    return reply.status(200).send({ message: status.message });
                } else {
                    const status = await ElectionDB.createNomination(this.db, { election_role_id, user_id: userId, manifesto_file_id });
                    if (status.isError()) return status.getResponse(reply);
                    return reply.status(201).send(status.getData());
                }
            } catch (e: any) {
                Logger.error('Failed to nominate', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        /**
         * User withdraws their nomination.
         */
        this.app.delete('/api/elections/:electionId/nominate/:roleId', { preHandler: [checkAuthentication('is_member')] }, async (req: any, reply) => {
            try {
                const { electionId, roleId } = req.params;
                const userId = req.user.id;

                const electionRes = await ElectionDB.getElectionById(this.db, parseInt(electionId));
                if (electionRes.isError()) return electionRes.getResponse(reply);
                if (electionRes.getData().phase !== 'nominations') {
                    return reply.status(403).send({ message: 'Nominations cannot be withdrawn after they have closed.' });
                }

                const status = await ElectionDB.deleteNomination(this.db, parseInt(roleId), userId);
                if (status.isError()) return status.getResponse(reply);
                return reply.status(200).send({ message: status.message });
            } catch (e: any) {
                Logger.error('Failed to withdraw nomination', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        /**
         * User submits votes for roles.
         * @param {string} req.params.electionId - Election ID.
         * @param {object} req.body - { votes: [{ election_role_id: number, nomination_id: number, rank?: number }] }.
         */
        this.app.post('/api/elections/:electionId/vote', { preHandler: [checkAuthentication('is_member')] }, async (req: any, reply) => {
            try {
                const electionId = parseInt(req.params.electionId); // For validation, not used in DB call
                const userId = req.user.id;
                const { votes } = req.body; // Array of { election_role_id, nomination_id, rank }

                if (!Array.isArray(votes) || votes.length === 0) {
                    return reply.status(400).send({ message: 'No votes provided.' });
                }

                // Check election phase (must be voting)
                const electionRes = await ElectionDB.getElectionById(this.db, electionId);
                if (electionRes.isError()) return electionRes.getResponse(reply);
                const election = electionRes.getData();
                if (election.phase !== 'voting') {
                    return reply.status(403).send({ message: 'Voting is not open for this election.' });
                }

                if (election.voting_type === 'in_person') {
                    return reply.status(403).send({ message: 'Online voting is disabled for this election. Please vote in person.' });
                }

                // Use a transaction for multiple votes
                await this.db.transaction(async (tx) => {
                    for (const vote of votes) {
                        const status = await ElectionDB.recordVote(tx, {
                            election_role_id: vote.election_role_id,
                            nomination_id: vote.nomination_id,
                            voter_user_id: userId,
                            vote_rank: vote.rank || 1
                        });
                                                  if (status.isError()) {
                                                      // Can decide to rollback on first error or continue with others
                                                      throw new Error(status.message || 'Unknown error'); 
                                                  }                    }
                });
                
                return reply.send({ success: true, message: 'Votes recorded.' });
            } catch (e: any) {
                Logger.error('Failed to record votes', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        // --- Public Endpoints (no special permissions required for viewing) ---

        /**
         * Get election details by ID (public view).
         */
        this.app.get('/api/elections/:id', async (req: any, reply) => {
            try {
                const electionId = parseInt(req.params.id);
                if (isNaN(electionId)) return reply.status(400).send({ message: 'Invalid election ID.' });

                const status = await ElectionDB.getElectionById(this.db, electionId);
                if (status.isError()) return status.getResponse(reply);
                return reply.status(200).send({ election: status.getData() });
            } catch (e: any) {
                Logger.error('Failed to get election by ID (public)', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        /**
         * Get all available elections (public view).
         */
        this.app.get('/api/elections', async (req: any, reply) => {
            try {
                const status = await ElectionDB.getAllElections(this.db); // No phase filter for general listing
                if (status.isError()) return status.getResponse(reply);
                return reply.status(200).send({ elections: status.getData() });
            } catch (e: any) {
                Logger.error('Failed to get all elections (public)', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        /**
         * Get roles for a specific election (public view).
         * @param {string} req.params.electionId - Election ID.
         */
        this.app.get('/api/elections/:electionId/roles', async (req: any, reply) => {
            try {
                const electionId = parseInt(req.params.electionId);
                if (isNaN(electionId)) return reply.status(400).send({ message: 'Invalid election ID.' });

                const status = await ElectionDB.getElectionRoles(this.db, electionId);
                if (status.isError()) return status.getResponse(reply);
                return reply.status(200).send({ roles: status.getData() });
            } catch (e: any) {
                Logger.error('Failed to get election roles (public)', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        /**
         * Get nominations for a specific election role (public view).
         * @param {string} req.params.electionId - Election ID (for validation).
         * @param {string} req.params.electionRoleId - Election Role ID.
         */
        this.app.get('/api/elections/:electionId/roles/:electionRoleId/nominations', async (req: any, reply) => {
            try {
                const electionId = parseInt(req.params.electionId);
                const electionRoleId = parseInt(req.params.electionRoleId);
                if (isNaN(electionId)) return reply.status(400).send({ message: 'Invalid election ID.' });
                if (isNaN(electionRoleId)) return reply.status(400).send({ message: 'Invalid election role ID.' });

                const electionRes = await ElectionDB.getElectionById(this.db, electionId);
                if (electionRes.isError()) return electionRes.getResponse(reply);
                const election = electionRes.getData();

                const status = await ElectionDB.getNominationsForRole(this.db, electionRoleId);
                if (status.isError()) return status.getResponse(reply);
                
                let noms = status.getData();
                // Filter approved nominations unless it's a phase where results are revealed/finalized
                if (!['results_revealed', 'roles_transferred', 'closed', 'completed'].includes(election.phase)) {
                    noms = noms.filter((n: any) => n.is_approved);
                }

                return reply.status(200).send({ nominations: noms });
            } catch (e: any) {
                Logger.error('Failed to get nominations for role (public)', e);
                return reply.status(500).send({ error: e.message });
            }
        });
    }
}

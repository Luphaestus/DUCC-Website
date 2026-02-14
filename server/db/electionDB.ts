// server/db/electionDB.ts

import BaseDB from './BaseDB.js';
import { statusObject } from '../misc/status.js';
import { DatabaseWrapper } from './db.js';
import Logger from '../misc/Logger.js';
import Utils from '../misc/utils.js';

interface ElectionData {
    id?: number;
    title: string;
    description?: string;
    start_date: string;
    voting_start_date?: string;
    end_date: string;
    voting_type?: 'online' | 'in_person' | 'hybrid';
    phase?: 'setup' | 'nominations' | 'voting' | 'closed' | 'results_revealed' | 'roles_transferred' | 'completed';
    managed_by_user_id?: number;
    created_at?: string;
    updated_at?: string;
}

interface ElectionRoleData {
    id?: number;
    election_id: number;
    role_id: number;
    max_winners?: number;
}

interface NominationData {
    id?: number;
    election_role_id: number;
    user_id: number;
    manifesto_file_id?: number | null;
    nomination_date?: string;
    approved_by_user_id?: number | null;
    approved_at?: string | null;
    is_approved?: number;
    is_winner?: number;
    votes_received?: number;
    local_votes_count?: number;
}

interface VoteData {
    election_role_id: number;
    nomination_id: number;
    voter_user_id?: number | null;
    vote_rank?: number;
}

export default class ElectionDB extends BaseDB {

    /**
     * Create a new election.
     * @param electionData - Data for the new election.
     */
    static async createElection(db: DatabaseWrapper, electionData: ElectionData): Promise<statusObject> {
        return this.wrap(async () => {
            const result = await db.run(
                `INSERT INTO elections (title, description, start_date, voting_start_date, end_date, phase, voting_type, managed_by_user_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    electionData.title,
                    electionData.description || null,
                    electionData.start_date,
                    electionData.voting_start_date || null,
                    electionData.end_date,
                    electionData.phase || 'setup',
                    electionData.voting_type || 'online',
                    electionData.managed_by_user_id || null
                ]
            );
            return new statusObject(201, 'Election created.', { id: result.lastID });
        });
    }

    /**
     * Update an existing election.
     * @param electionId - ID of the election to update.
     * @param electionData - Data to update.
     */
    static async updateElection(db: DatabaseWrapper, electionId: number, electionData: Partial<ElectionData>): Promise<statusObject> {
        const allowedFields: (keyof ElectionData)[] = [
            'title', 'description', 'start_date', 'voting_start_date', 'end_date', 'phase', 'voting_type', 'managed_by_user_id'
        ];
        return this.updateRecord(db, 'elections', electionId, electionData, allowedFields as string[]);
    }

    /**
     * Get an election by its ID.
     * @param electionId - ID of the election.
     */
    static async getElectionById(db: DatabaseWrapper, electionId: number): Promise<statusObject> {
        return this.wrap(async () => {
            const election = await db.get('SELECT * FROM elections WHERE id = ?', [electionId]);
            if (!election) return new statusObject(404, 'Election not found.');
            return new statusObject(200, null, election);
        });
    }

    /**
     * Get all elections, optionally filtering by phase.
     * @param phase - Optional phase to filter by.
     */
    static async getAllElections(db: DatabaseWrapper, phase?: ElectionData['phase']): Promise<statusObject> {
        return this.wrap(async () => {
            let query = 'SELECT * FROM elections';
            const params: any[] = [];
            if (phase) {
                query += ' WHERE phase = ?';
                params.push(phase);
            }
            query += ' ORDER BY start_date DESC';
            const elections = await db.all(query, params);
            return new statusObject(200, null, elections);
        });
    }

    /**
     * Delete an election.
     * @param electionId - ID of the election to delete.
     */
    static async deleteElection(db: DatabaseWrapper, electionId: number): Promise<statusObject> {
        return this.wrap(async () => {
            const result = await db.run('DELETE FROM elections WHERE id = ?', [electionId]);
            if (result.changes === 0) return new statusObject(404, 'Election not found.');
            return new statusObject(200, 'Election deleted.');
        });
    }

    /**
     * Add a role to an election.
     * @param electionRoleData - Data for the election role.
     */
    static async addElectionRole(db: DatabaseWrapper, electionRoleData: ElectionRoleData): Promise<statusObject> {
        return this.wrap(async () => {
            const result = await db.run(
                `INSERT INTO election_roles (election_id, role_id, max_winners)
                 VALUES (?, ?, ?)`,
                [electionRoleData.election_id, electionRoleData.role_id, electionRoleData.max_winners || 1]
            );
            return new statusObject(201, 'Election role added.', { id: result.lastID });
        });
    }

    /**
     * Get all roles for a specific election.
     * @param electionId - ID of the election.
     */
    static async getElectionRoles(db: DatabaseWrapper, electionId: number): Promise<statusObject> {
        return this.wrap(async () => {
            const roles = await db.all(
                `SELECT er.id, er.election_id, er.role_id, er.max_winners, r.name as role_name, r.description as role_description
                 FROM election_roles er
                 JOIN roles r ON er.role_id = r.id
                 WHERE er.election_id = ?
                 ORDER BY r.exec_ranking ASC, r.name ASC`,
                [electionId]
            );
            return new statusObject(200, null, roles);
        });
    }

    /**
     * Get a specific election role by its ID.
     * @param electionRoleId - ID of the election role.
     */
    static async getElectionRoleById(db: DatabaseWrapper, electionRoleId: number): Promise<statusObject> {
        return this.wrap(async () => {
            const role = await db.get(
                `SELECT er.id, er.election_id, er.role_id, er.max_winners, r.name as role_name, r.description as role_description
                 FROM election_roles er
                 JOIN roles r ON er.role_id = r.id
                 WHERE er.id = ?`,
                [electionRoleId]
            );
            if (!role) return new statusObject(404, 'Election role not found.');
            return new statusObject(200, null, role);
        });
    }

    /**
     * Update an election role.
     * @param electionRoleId - ID of the election role to update.
     * @param data - Data to update (e.g., max_winners).
     */
    static async updateElectionRole(db: DatabaseWrapper, electionRoleId: number, data: Partial<ElectionRoleData>): Promise<statusObject> {
        return this.wrap(async () => {
            const { id, election_id, role_id, ...updateFields } = data;
            const keys = Object.keys(updateFields);
            if (keys.length === 0) return new statusObject(200, 'No fields to update.');

            const sets = keys.map(k => `${k} = ?`).join(', ');
            const result = await db.run(
                `UPDATE election_roles SET ${sets} WHERE id = ?`,
                [...Object.values(updateFields), electionRoleId]
            );
            if (result.changes === 0) return new statusObject(404, 'Election role not found.');
            return new statusObject(200, 'Election role updated.');
        });
    }

    /**
     * Remove a role from an election.
     * @param electionRoleId - ID of the election role to remove.
     */
    static async removeElectionRole(db: DatabaseWrapper, electionRoleId: number): Promise<statusObject> {
        return this.wrap(async () => {
            const result = await db.run('DELETE FROM election_roles WHERE id = ?', [electionRoleId]);
            if (result.changes === 0) return new statusObject(404, 'Election role not found.');
            return new statusObject(200, 'Election role removed.');
        });
    }

    /**
     * Create a new nomination.
     * @param nominationData - Data for the new nomination.
     */
    static async createNomination(db: DatabaseWrapper, nominationData: NominationData): Promise<statusObject> {
        return this.wrap(async () => {
            const result = await db.run(
                `INSERT INTO nominations (election_role_id, user_id, manifesto_file_id)
                 VALUES (?, ?, ?)`,
                [nominationData.election_role_id, nominationData.user_id, nominationData.manifesto_file_id || null]
            );
            return new statusObject(201, 'Nomination created.', { id: result.lastID });
        });
    }

    /**
     * Update a nomination (e.g., replace manifesto).
     */
    static async updateNomination(db: DatabaseWrapper, electionRoleId: number, userId: number, manifestoFileId: number): Promise<statusObject> {
        return this.wrap(async () => {
            const result = await db.run(
                `UPDATE nominations SET manifesto_file_id = ? WHERE election_role_id = ? AND user_id = ?`,
                [manifestoFileId, electionRoleId, userId]
            );
            if (result.changes === 0) return new statusObject(404, 'Nomination not found.');
            return new statusObject(200, 'Nomination updated.');
        });
    }

    /**
     * Delete a nomination.
     */
    static async deleteNomination(db: DatabaseWrapper, electionRoleId: number, userId: number): Promise<statusObject> {
        return this.wrap(async () => {
            const result = await db.run(
                `DELETE FROM nominations WHERE election_role_id = ? AND user_id = ?`,
                [electionRoleId, userId]
            );
            if (result.changes === 0) return new statusObject(404, 'Nomination not found.');
            return new statusObject(200, 'Nomination withdrawn.');
        });
    }

    /**
     * Approve a nomination (President action).
     * @param nominationId - ID of the nomination to approve.
     * @param approverUserId - ID of the user approving the nomination.
     */
    static async approveNomination(db: DatabaseWrapper, nominationId: number, approverUserId: number): Promise<statusObject> {
        return this.wrap(async () => {
            const result = await db.run(
                `UPDATE nominations SET is_approved = 1, approved_by_user_id = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [approverUserId, nominationId]
            );
            if (result.changes === 0) return new statusObject(404, 'Nomination not found or already approved.');
            return new statusObject(200, 'Nomination approved.');
        });
    }

    /**
     * Get all nominations for a specific election role.
     * @param electionRoleId - ID of the election role.
     */
    static async getNominationsForRole(db: DatabaseWrapper, electionRoleId: number): Promise<statusObject> {
        return this.wrap(async () => {
            const nominations = await db.all(
                `SELECT n.id, n.user_id, u.first_name, u.last_name, n.manifesto_file_id, 
                        f.title as manifesto_title, CONCAT('/api/files/', f.id, '/download') as manifesto_path,
                        n.nomination_date, n.is_approved, n.votes_received, n.is_winner, n.election_role_id, n.local_votes_count,
                        COALESCE(u.profile_picture_color, '#000000') as profile_picture_color,
                        COALESCE(u.profile_picture_font, 'Arial') as profile_picture_font,
                        COALESCE(u.profile_picture_initials, CONCAT(SUBSTR(u.first_name, 1, 1), SUBSTR(u.last_name, 1, 1))) as profile_picture_initials,
                        CASE WHEN u.profile_picture_id IS NOT NULL THEN CONCAT('/api/files/', u.profile_picture_id, '/download', CHAR(63), 'view=true') ELSE NULL END as profile_picture_path
                 FROM nominations n
                 JOIN users u ON n.user_id = u.id
                 LEFT JOIN files f ON n.manifesto_file_id = f.id
                 WHERE n.election_role_id = ?
                 ORDER BY n.nomination_date ASC`,
                [electionRoleId]
            );
            return new statusObject(200, null, nominations);
        });
    }

    /**
     * Update the local_votes_count for a specific nomination.
     * @param nominationId - ID of the nomination to update.
     * @param localVotesCount - The new count of local votes.
     */
    static async updateNominationLocalVotes(db: DatabaseWrapper, nominationId: number, localVotesCount: number): Promise<statusObject> {
        return this.wrap(async () => {
            const result = await db.run(
                'UPDATE nominations SET local_votes_count = ? WHERE id = ?',
                [localVotesCount, nominationId]
            );
            if (result.changes === 0) return new statusObject(404, 'Nomination not found or no changes made.');
            return new statusObject(200, 'Local votes count updated.');
        });
    }


    /**
     * Record a vote for a nomination.
     * @param voteData - Data for the new vote.
     */
    static async recordVote(db: DatabaseWrapper, voteData: VoteData): Promise<statusObject> {
        return this.wrap(async () => {
            // Check if voter has already voted for this election_role
            const existingVote = await db.get(
                'SELECT id FROM votes WHERE election_role_id = ? AND voter_user_id = ?',
                [voteData.election_role_id, voteData.voter_user_id]
            );
            if (existingVote) return new statusObject(409, 'User has already voted for this role.');

            await db.run(
                `INSERT INTO votes (election_role_id, nomination_id, voter_user_id, vote_rank)
                 VALUES (?, ?, ?, ?)`,
                [voteData.election_role_id, voteData.nomination_id, voteData.voter_user_id, voteData.vote_rank || 1]
            );
            return new statusObject(201, 'Vote recorded.');
        });
    }

    /**
     * Get votes for a specific election role (admin/results calculation).
     * @param electionRoleId - ID of the election role.
     */
    static async getVotesForRole(db: DatabaseWrapper, electionRoleId: number): Promise<statusObject> {
        return this.wrap(async () => {
            const votes = await db.all(
                `SELECT nomination_id, COUNT(id) as vote_count
                 FROM votes
                 WHERE election_role_id = ?
                 GROUP BY nomination_id
                 ORDER BY vote_count DESC`,
                [electionRoleId]
            );
            return new statusObject(200, null, votes);
        });
    }

    /**
     * Calculate and store election results for a given election.
     * This method should be called when the voting phase ends.
     */
    static async calculateResults(db: DatabaseWrapper, electionId: number): Promise<statusObject> {
        return this.wrap(async () => {
            return await db.transaction(async (tx) => {
                const electionRolesRes = await this.getElectionRoles(tx, electionId);
                if (electionRolesRes.isError()) return electionRolesRes;
                const electionRoles = electionRolesRes.getData();

                for (const electionRole of electionRoles) {
                    const nominationsRes = await this.getNominationsForRole(tx, electionRole.id);
                    if (nominationsRes.isError()) continue;
                    let nominations = nominationsRes.getData().filter((n: any) => n.is_approved); // Only approved nominees

                    // Calculate online votes for approved nominations
                    const votesRes = await this.getVotesForRole(tx, electionRole.id);
                    if (votesRes.isError()) continue;
                    const onlineVoteCounts = votesRes.getData().reduce((acc: any, curr: any) => {
                        acc[curr.nomination_id] = curr.vote_count;
                        return acc;
                    }, {});

                    // Calculate total votes (online + local) for each nominee and update votes_received
                    for (const nom of nominations) {
                        const onlineVotes = onlineVoteCounts[nom.id] || 0;
                        const totalVotes = onlineVotes + (nom.local_votes_count || 0);
                        await tx.run('UPDATE nominations SET votes_received = ? WHERE id = ?', [totalVotes, nom.id]);
                        nom.votes_received = totalVotes; // Update local object with total
                    }

                    // Sort nominations by votes received (descending)
                    nominations.sort((a: any, b: any) => b.votes_received - a.votes_received);

                    // Mark winners based on max_winners
                    for (let i = 0; i < nominations.length; i++) {
                        const isWinner = (i < electionRole.max_winners) ? 1 : 0;
                        await tx.run('UPDATE nominations SET is_winner = ? WHERE id = ?', [isWinner, nominations[i].id]);
                    }
                }
                return new statusObject(200, 'Election results calculated.');
            });
        });
    }

    /**
     * Transfer roles based on election results.
     * This should be called after results are calculated and revealed.
     * @param electionId - ID of the election.
     * @param approverUserId - ID of the user initiating the transfer (President).
     */
    static async transferRoles(db: DatabaseWrapper, electionId: number, approverUserId: number): Promise<statusObject> {
        return db.transaction(async (tx) => {
            const ExecDB = (await import('./execDB.js')).default;
            const RolesDB = (await import('./rolesDB.js')).default;

            const electionRes = await this.getElectionById(tx, electionId);
            if (electionRes.isError()) return electionRes;
            const election = electionRes.getData();

            if (election.phase !== 'results_revealed') {
                return new statusObject(400, 'Roles can only be transferred after results are revealed.');
            }

            // Archive the current committee first
            const archiveRes = await ExecDB.archiveCurrentCommittee(tx);
            if (archiveRes.isError()) return archiveRes;

            // Flag all outgoing exec members for goodbye overlay
            await tx.run(`
                UPDATE users u
                JOIN user_roles ur ON u.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                JOIN role_permissions rp ON r.id = rp.role_id
                JOIN permissions p ON rp.permission_id = p.id
                SET u.goodbye_role = r.name
                WHERE p.slug = 'exec.publish'
            `);

            // Remove all current roles from users that have exec.publish permission
            await tx.run(`
                DELETE ur FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN role_permissions rp ON r.id = rp.role_id
                JOIN permissions p ON rp.permission_id = p.id
                WHERE p.slug = 'exec.publish'
            `);
            
            // Assign roles to winners
            const electionRolesRes = await this.getElectionRoles(tx, electionId);
            if (electionRolesRes.isError()) return electionRolesRes;
            const electionRoles = electionRolesRes.getData();

            for (const electionRole of electionRoles) {
                const winners = await tx.all(
                    `SELECT n.user_id, n.manifesto_file_id, n.votes_received
                     FROM nominations n
                     WHERE n.election_role_id = ? AND n.is_winner = 1`,
                    [electionRole.id]
                );

                for (const winner of winners) {
                    await RolesDB.assignRole(tx, winner.user_id, electionRole.role_id);
                    // Add winner to exec_committee or update existing entry
                    await ExecDB.addExecMember(tx, {
                        userId: winner.user_id,
                        roleName: electionRole.role_name,
                        displayOrder: electionRole.exec_ranking, // Assuming roles table has exec_ranking
                        votesReceived: winner.votes_received,
                        termStart: new Date().toISOString().slice(0, 10),
                        isCurrent: 1,
                        manifestoFileId: winner.manifesto_file_id
                    });
                }
            }

            await this.updateElection(tx, electionId, { phase: 'roles_transferred' });
            return new statusObject(200, 'Roles transferred successfully.');
        }).catch(error => {
            Logger.error('Database error in transferRoles:', error);
            return new statusObject(500, 'Database error');
        });
    }
}

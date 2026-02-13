// src/client/pages/admin/ElectionForm.tsx

import { createSignal, createResource, Show, For } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { useNavigate } from "@solidjs/router";
import PageTitle from "@/components/PageTitle";
import { ARROW_BACK_IOS_NEW_SVG, SAVE_SVG, ADD_SVG, DELETE_SVG } from "@/utils/icons";
import RichTextEditor from "@/components/RichTextEditor";
import { smartDateAdjust } from "@/utils/utils";

interface Election {
    id: number;
    title: string;
    description: string;
    start_date: string;
    voting_start_date: string;
    end_date: string;
    voting_type: 'online' | 'in_person' | 'hybrid';
    phase: 'setup' | 'nominations' | 'voting' | 'closed' | 'results_revealed' | 'roles_transferred';
    managed_by_user_id: number;
    created_at: string;
    updated_at: string;
}

interface ElectionRole {
    id: number;
    election_id: number;
    role_id: number;
    max_winners: number;
    role_name: string;
    role_description: string;
}

interface Nomination {
    id: number;
    user_id: number;
    first_name: string;
    last_name: string;
    manifesto_file_id: number;
    manifesto_path: string;
    manifesto_title: string;
    is_approved: number;
    votes_received: number;
    local_votes_count: number;
    election_role_id: number;
}

interface Role {
    id: number;
    name: string;
    description: string;
}

const phaseColors: Record<string, string> = {
    'setup': 'neutral',
    'nominations': 'primary',
    'voting': 'warning',
    'closed': 'danger',
    'results_revealed': 'success',
    'roles_transferred': 'success'
};

const formatDateForInput = (dateStr: string | undefined | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function ElectionForm(props: { electionId: string, onSave: () => void }) {
    const { notify } = useNotifications();
    const navigate = useNavigate();
    const isNew = () => props.electionId === 'new';

    const [electionData, setElectionData] = createSignal<Partial<Election>>({});
    const [descriptionContent, setDescriptionContent] = createSignal("");
    const [availableRoles] = createResource(async () => {
        const res = await apiRequest('GET', '/api/admin/roles');
        return (res.roles || []) as Role[];
    });
    const [electionRoles, setElectionRoles] = createSignal<ElectionRole[]>([]);
    const [nominations, setNominations] = createSignal<Nomination[]>([]);

    const [fetchedElection] = createResource(isNew() ? null : props.electionId, async (id) => {
        const res = await apiRequest('GET', `/api/admin/elections/${id}`);
        if (res.error) {
            notify('Error', res.error, 'error');
            navigate('/admin/elections');
            return null;
        }
        setElectionData(res.election);
        setDescriptionContent(res.election.description || "");

        // Fetch election roles and nominations if election exists
        const rolesRes = await apiRequest('GET', `/api/admin/elections/${id}/roles`);
        if (!rolesRes.error) {
            setElectionRoles(rolesRes.roles || []);
            // Fetch nominations for each role
            const allNominations: Nomination[] = [];
            for (const role of rolesRes.roles) {
                const nomRes = await apiRequest('GET', `/api/elections/${id}/roles/${role.id}/nominations`);
                if (!nomRes.error) {
                    allNominations.push(...(nomRes.nominations || []));
                }
            }
            setNominations(allNominations);
        }
        return res.election;
    });

    const updateField = (field: keyof Election, value: any) => {
        setElectionData(prev => ({ ...prev, [field]: value }));
    };

    const handleDescriptionInput = (value: string) => {
        setDescriptionContent(value);
        updateField('description', value);
    };

    const handleSave = async (e: Event) => {
        e.preventDefault();
        const dataToSave = {
            ...electionData(),
            description: descriptionContent(),
            start_date: electionData().start_date ? new Date(electionData().start_date!).toISOString() : null,
            voting_start_date: electionData().voting_start_date ? new Date(electionData().voting_start_date!).toISOString() : null,
            end_date: electionData().end_date ? new Date(electionData().end_date!).toISOString() : null,
        };

        try {
            if (isNew()) {
                await apiRequest('POST', '/api/admin/elections', dataToSave);
                notify('Success', 'Election created successfully', 'success');
            } else {
                await apiRequest('PUT', `/api/admin/elections/${props.electionId}`, dataToSave);
                notify('Success', 'Election updated successfully', 'success');
            }
            props.onSave(); // Call onSave to refetch list and navigate
        } catch (error: any) {
            notify('Error', error.message || 'Failed to save election', 'error');
        }
    };

    const handleAddRole = async (roleId: number) => {
        const role = availableRoles()?.find(r => r.id === roleId);
        if (!role || !electionData().id) return;

        try {
            const res = await apiRequest('POST', `/api/admin/elections/${electionData().id}/roles`, { role_id: roleId });
            if (res.id) {
                setElectionRoles(prev => [...prev, {
                    id: res.id,
                    election_id: electionData().id!,
                    role_id: roleId,
                    max_winners: 1, // Default max_winners
                    role_name: role.name,
                    role_description: role.description
                }]);
                notify('Success', `${role.name} added to election.`, 'success');
            }
        } catch (error: any) {
            notify('Error', error.message || 'Failed to add role.', 'error');
        }
    };

    const handleRemoveRole = async (electionRoleId: number) => {
        if (!electionData().id) return;
        if (!confirm('Are you sure you want to remove this role from the election? This will also remove all nominations for it.')) return;
        try {
            await apiRequest('DELETE', `/api/admin/elections/${electionData().id}/roles/${electionRoleId}`);
            setElectionRoles(prev => prev.filter(er => er.id !== electionRoleId));
            setNominations(prev => prev.filter(nom => nom.election_role_id !== electionRoleId));
            notify('Success', 'Election role removed.', 'success');
        } catch (error: any) {
            notify('Error', error.message || 'Failed to remove role.', 'error');
        }
    };

    const handleUpdateLocalVotes = async (nominationId: number, count: number) => {
        try {
            await apiRequest('PUT', `/api/admin/nominations/${nominationId}/local-votes`, { local_votes_count: count });
            setNominations(prev => prev.map(n => n.id === nominationId ? { ...n, local_votes_count: count } : n));
            notify('Success', 'Local votes updated.', 'success');
        } catch (error: any) {
            notify('Error', error.message || 'Failed to update local votes.', 'error');
        }
    };

    const handleApproveNomination = async (nominationId: number) => {
        try {
            await apiRequest('PUT', `/api/admin/nominations/${nominationId}/approve`);
            setNominations(prev => prev.map(n => n.id === nominationId ? { ...n, is_approved: 1 } : n));
            notify('Success', 'Nomination approved.', 'success');
        } catch (error: any) {
            notify('Error', error.message || 'Failed to approve nomination.', 'error');
        }
    };

    const handleUpdatePhase = async (newPhase: Election['phase']) => {
        if (!electionData().id) return;
        try {
            await apiRequest('PUT', `/api/admin/elections/${electionData().id}`, { phase: newPhase });
            setElectionData(prev => ({ ...prev, phase: newPhase }));
            notify('Success', `Election phase set to ${newPhase}.`, 'success');
        } catch (error: any) {
            notify('Error', error.message || 'Failed to update election phase.', 'error');
        }
    };

    const handleCalculateResults = async () => {
        if (!electionData().id) return;
        try {
            await apiRequest('GET', `/api/admin/elections/${electionData().id}/results`);
            notify('Success', 'Results calculated. You can now view them.', 'success');
            // Refetch nominations to show updated votes_received/is_winner status
            const allNominations: Nomination[] = [];
            for (const role of electionRoles()) {
                const nomRes = await apiRequest('GET', `/api/elections/${electionData().id}/roles/${role.id}/nominations`);
                if (!nomRes.error) {
                    allNominations.push(...(nomRes.nominations || []));
                }
            }
            setNominations(allNominations);
        } catch (error: any) {
            notify('Error', error.message || 'Failed to calculate results.', 'error');
        }
    };

    const handleTransferRoles = async () => {
        if (!electionData().id) return;
        if (!confirm('Are you sure you want to transfer roles? This will archive the current committee and assign roles to winners.')) return;
        try {
            await apiRequest('POST', `/api/admin/elections/${electionData().id}/transfer-roles`);
            notify('Success', 'Roles transferred successfully.', 'success');
            handleUpdatePhase('roles_transferred'); // Update phase after transfer
        } catch (error: any) {
            notify('Error', error.message || 'Failed to transfer roles.', 'error');
        }
    };


    return (
        <div class="glass-layout">
            <button class="small-btn secondary outline" onClick={() => navigate('/admin/elections')}>
                <span innerHTML={ARROW_BACK_IOS_NEW_SVG} /> Back
            </button>
            <PageTitle text={isNew() ? 'New Election' : `Edit Election: ${electionData().title || ''}`} />

            <div class="panel">
                <div class="panel-header">
                    <h3 style="margin: 0;">Election Details</h3>
                    <div class="panel-actions">
                        <Show when={!isNew()}>
                            <button class="small-btn delete outline" onClick={() => { /* Implement delete logic */ }} title="Delete">
                                <span innerHTML={DELETE_SVG} /> Delete
                            </button>
                        </Show>
                    </div>
                </div>
                <div class="panel-content">
                    <form class="modern-form" onSubmit={handleSave}>
                        <Show when={electionData()} fallback={<p>Loading...</p>}>
                            <label class="form-label-top">Title
                                <input type="text" value={electionData().title || ''} onInput={(e) => updateField('title', e.currentTarget.value)} required />
                            </label>
                            <label class="form-label-top">Description
                                <RichTextEditor value={descriptionContent()} onInput={handleDescriptionInput} />
                            </label>

                            <div class="grid-2-col">
                                <label class="form-label-top">Start Date
                                    <input type="datetime-local" value={formatDateForInput(electionData().start_date) || ''} onChange={(e) => {
                                        const { date, valid } = smartDateAdjust(e.currentTarget.value);
                                        if (valid) updateField('start_date', date.toISOString());
                                    }} onFocus={(e) => {
                                        if (!e.currentTarget.value) {
                                            const d = new Date();
                                            d.setMinutes(0, 0, 0);
                                            updateField('start_date', d.toISOString());
                                        }
                                    }} required />
                                </label>
                                <label class="form-label-top">Voting Start Date (optional)
                                    <input type="datetime-local" value={electionData().voting_start_date ? formatDateForInput(electionData().voting_start_date) : ''} onChange={(e) => {
                                        const { date, valid } = smartDateAdjust(e.currentTarget.value);
                                        if (valid) updateField('voting_start_date', date.toISOString());
                                    }} onFocus={(e) => {
                                        if (!e.currentTarget.value && electionData().start_date) {
                                            updateField('voting_start_date', electionData().start_date);
                                        }
                                    }} />
                                </label>
                                <label class="form-label-top">End Date
                                    <input type="datetime-local" value={formatDateForInput(electionData().end_date) || ''} onChange={(e) => {
                                        const { date, valid } = smartDateAdjust(e.currentTarget.value);
                                        if (valid) updateField('end_date', date.toISOString());
                                    }} onFocus={(e) => {
                                        if (!e.currentTarget.value) {
                                            const d = new Date(electionData().start_date || new Date());
                                            d.setHours(d.getHours() + 1);
                                            updateField('end_date', d.toISOString());
                                        }
                                    }} required />
                                </label>
                                <label class="form-label-top">Voting Type
                                    <select value={electionData().voting_type || 'online'} onInput={(e) => updateField('voting_type', e.currentTarget.value as Election['voting_type'])}>
                                        <option value="online">Online</option>
                                        <option value="in_person">In-Person</option>
                                        <option value="hybrid">Hybrid</option>
                                    </select>
                                </label>
                            </div>

                            <div class="form-actions-footer">
                                <button type="submit" class="primary-btn wide-btn">
                                    <span innerHTML={SAVE_SVG} /> Save Election
                                </button>
                            </div>
                        </Show>
                    </form>
                </div>
            </div>

            <Show when={!isNew() && fetchedElection()}>
                <div class="panel">
                    <div class="panel-header">
                        <h3 style="margin: 0;">Election Management</h3>
                    </div>
                    <div class="panel-content">
                        <div class="grid-2-col gap-4">
                            <div>
                                <h4 class="mb-2">Phase Control</h4>
                                <p>Current: <span class={`badge ${phaseColors[electionData().phase || 'setup']}`}>{electionData().phase?.replace(/_/g, ' ') || 'Setup'}</span></p>
                                <div class="flex flex-wrap gap-2">
                                    <button class="small-btn primary" onClick={() => handleUpdatePhase('nominations')} disabled={electionData().phase === 'nominations'}>Open Nominations</button>
                                    <button class="small-btn primary" onClick={() => handleUpdatePhase('voting')} disabled={electionData().phase === 'voting'}>Open Voting</button>
                                    <button class="small-btn danger" onClick={() => handleUpdatePhase('closed')} disabled={electionData().phase === 'closed'}>Close Election</button>
                                    <button class="small-btn warning" onClick={() => handleCalculateResults()} disabled={electionData().phase !== 'closed'}>Calculate Results</button>
                                    <button class="small-btn success" onClick={() => handleUpdatePhase('results_revealed')} disabled={electionData().phase !== 'closed'}>Reveal Results</button>
                                    <button class="small-btn success" onClick={() => handleTransferRoles()} disabled={electionData().phase !== 'results_revealed'}>Transfer Roles</button>
                                </div>
                            </div>
                            <div>
                                <h4 class="mb-2">Add Role to Election</h4>
                                <div class="flex gap-2">
                                    <select id="available-roles-select" class="flex-grow">
                                        <option value="">Select a role</option>
                                        <For each={availableRoles()}>
                                            {(role) => <option value={role.id}>{role.name}</option>}
                                        </For>
                                    </select>
                                    <button class="small-btn primary" onClick={() => {
                                        const selectEl = document.getElementById('available-roles-select') as HTMLSelectElement;
                                        if (selectEl.value) handleAddRole(parseInt(selectEl.value));
                                    }}>
                                        <span innerHTML={ADD_SVG} /> Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="panel">
                    <div class="panel-header">
                        <h3 style="margin: 0;">Election Roles & Nominations</h3>
                    </div>
                    <div class="panel-content">
                        <For each={electionRoles()}>
                            {(electionRole) => (
                                <div class="election-role-section pb-4 border-bottom">
                                    <div class="flex justify-between items-center">
                                        <h4 class="mb-0">{electionRole.role_name} (Max Winners: {electionRole.max_winners})</h4>
                                        <button class="small-btn delete outline" onClick={() => handleRemoveRole(electionRole.id)}>
                                            <span innerHTML={DELETE_SVG} /> Remove Role
                                        </button>
                                    </div>
                                    <div class="nominations-list">
                                        <Show when={nominations().filter(n => n.election_role_id === electionRole.id).length > 0} fallback={<p class="text-muted">No nominations yet for this role.</p>}>
                                            <For each={nominations().filter(n => n.election_role_id === electionRole.id)}>
                                                {(nomination) => (
                                                    <div class="nomination-item flex items-center gap-4 p-2 rounded-lg border border-gray-200">
                                                        <span class="font-bold">{nomination.first_name} {nomination.last_name}</span>
                                                        <Show when={nomination.manifesto_path}>
                                                            <a href={nomination.manifesto_path} target="_blank" class="small-btn outline">View Manifesto</a>
                                                        </Show>
                                                        <Show when={nomination.is_approved === 0}>
                                                            <button class="small-btn primary" onClick={() => handleApproveNomination(nomination.id)}>Approve</button>
                                                        </Show>
                                                        <div class="flex items-center gap-2 ml-auto">
                                                            <label class="form-label-inline">Online Votes: {nomination.votes_received || 0}</label>
                                                            <label class="form-label-inline">Local Votes:
                                                                <input
                                                                    type="number"
                                                                    class="mini-input w-24 ml-2"
                                                                    value={nomination.local_votes_count || 0}
                                                                    onInput={(e) => handleUpdateLocalVotes(nomination.id, parseInt(e.currentTarget.value) || 0)}
                                                                    min="0"
                                                                />
                                                            </label>
                                                        </div>
                                                    </div>
                                                )}
                                            </For>
                                        </Show>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </div>
            </Show>
        </div>
    );
}
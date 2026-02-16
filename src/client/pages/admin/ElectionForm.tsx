// src/client/pages/admin/ElectionForm.tsx

import { createSignal, createResource, Show, For, createMemo, onMount, onCleanup } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { useNavigate } from "@solidjs/router";
import PageTitle from "@/components/PageTitle";
import { FaSolidChevronLeft, FaSolidFloppyDisk, FaSolidPlus, FaSolidTrash, FaSolidTicket, FaSolidGear, FaSolidCircleInfo } from 'solid-icons/fa';
import RichTextEditor from "@/components/RichTextEditor";
import { showConfirmModal } from "@/utils/modal";
import { ElectionUpdatedEvent } from "@/utils/events/events";

interface Election {
    id: number;
    title: string;
    description: string;
    start_date?: string;
    voting_start_date?: string;
    end_date?: string;
    voting_type?: 'online' | 'in_person' | 'hybrid';
    phase: 'setup' | 'nominations' | 'voting' | 'closed' | 'results_revealed' | 'roles_transferred' | 'completed';
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
    'roles_transferred': 'success',
    'completed': 'neutral'
};

const phaseLabels: Record<string, string> = {
    'setup': 'Setup',
    'nominations': 'Nominations',
    'voting': 'Voting',
    'closed': 'Closed',
    'results_revealed': 'Results Revealed',
    'roles_transferred': 'Roles Transferred',
    'completed': 'Completed (Archived)'
};

export default function ElectionForm(props: { electionId: string, onSave: () => void }) {
    const { notify } = useNotifications();
    const navigate = useNavigate();
    const isNew = () => props.electionId === 'new';

    const [electionData, setElectionData] = createSignal<Partial<Election>>({});
    const [descriptionContent, setDescriptionContent] = createSignal("");
    const [isDirty, setIsDirty] = createSignal(false);

    const [availableRoles] = createResource(async () => {
        try {
            const res = await apiRequest('GET', '/api/admin/roles');
            return (Array.isArray(res) ? res : (res.roles || res.data || [])) as Role[];
        } catch (e) {
            console.error('Failed to load available roles', e);
            return [];
        }
    });
    const [electionRoles, setElectionRoles] = createSignal<ElectionRole[]>([]);
    const [newElectionRoles, setNewElectionRoles] = createSignal<{ role_id: number, max_winners: number, role_name: string }[]>([]);
    const [nominations, setNominations] = createSignal<Nomination[]>([]);

    const fetchElectionData = async (id: string) => {
        try {
            const res = await apiRequest('GET', `/api/admin/elections/${id}`);
            if (!res || res.error) {
                notify('Error', res?.error || 'Election not found', 'error');
                navigate('/admin/elections');
                return null;
            }

            const election = res.election || res.data || res;
            if (!election) throw new Error('Election data missing');

            setElectionData(election);
            setDescriptionContent(election.description || "");
            setIsDirty(false);

            // Fetch election roles and nominations if election exists
            const rolesRes = await apiRequest('GET', `/api/admin/elections/${id}/roles`);
            const roles = rolesRes?.roles || rolesRes?.data || (Array.isArray(rolesRes) ? rolesRes : []);

            if (Array.isArray(roles)) {
                setElectionRoles(roles);
                // Fetch nominations for each role
                const allNominations: Nomination[] = [];
                for (const role of roles) {
                    try {
                        const nomRes = await apiRequest('GET', `/api/elections/${id}/roles/${role.id}/nominations`);
                        const noms = nomRes?.nominations || nomRes?.data || (Array.isArray(nomRes) ? nomRes : []);
                        if (Array.isArray(noms)) {
                            allNominations.push(...noms);
                        }
                    } catch (e) {
                        console.error(`Failed to load nominations for role ${role.id}`, e);
                    }
                }
                setNominations(allNominations);
            }
            return election;
        } catch (e: any) {
            console.error('fetchElectionData failed', e);
            notify('Error', e.message || 'Failed to load election details', 'error');
            throw e;
        }
    };

    const [fetchedElection, { refetch: refetchElection }] = createResource(isNew() ? null : props.electionId, fetchElectionData);

    onMount(() => {
        const unsubscribe = ElectionUpdatedEvent.subscribe(() => {
            if (!isNew()) refetchElection();
        });
        onCleanup(unsubscribe);
    });

    const isReadOnly = createMemo(() => ['roles_transferred', 'completed'].includes(electionData().phase || ''));
    const isClosed = createMemo(() => ['closed', 'results_revealed', 'roles_transferred', 'completed'].includes(electionData().phase || ''));

    const updateField = (field: keyof Election, value: any) => {
        if (isReadOnly()) return;
        setElectionData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleDescriptionInput = (value: string) => {
        setDescriptionContent(value);
        updateField('description', value);
    };

    const handleSave = async (e: Event) => {
        e.preventDefault();
        if (isReadOnly()) return;

        const dataToSave = {
            ...electionData(),
            description: descriptionContent(),
            start_date: new Date().toISOString(), // Default to now
            end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(), // Default to 1 year from now
            voting_type: electionData().voting_type || 'online'
        };

        try {
            let electionId = props.electionId;
            if (isNew()) {
                const res = await apiRequest('POST', '/api/admin/elections', dataToSave);
                electionId = (res.data?.id || res.id).toString();

                // Add initial roles
                for (const role of newElectionRoles()) {
                    await apiRequest('POST', `/api/admin/elections/${electionId}/roles`, { role_id: role.role_id, max_winners: role.max_winners });
                }

                notify('Success', 'Election created successfully', 'success');
            } else {
                await apiRequest('PUT', `/api/admin/elections/${props.electionId}`, dataToSave);
                notify('Success', 'Election updated successfully', 'success');
            }
            ElectionUpdatedEvent.notify();
            setIsDirty(false);
            props.onSave(); // Call onSave to refetch list and navigate
        } catch (error: any) {
            notify('Error', error.message || 'Failed to save election', 'error');
        }
    };

    const handleAddRole = async (roleId: number) => {
        if (isClosed()) return;
        const role = availableRoles()?.find(r => r.id === roleId);
        if (!role) return;

        if (isNew()) {
            setNewElectionRoles(prev => [...prev, { role_id: roleId, max_winners: 1, role_name: role.name }]);
            return;
        }

        if (!electionData().id) return;

        try {
            const res = await apiRequest('POST', `/api/admin/elections/${electionData().id}/roles`, { role_id: roleId });
            const newId = res.data?.id || res.id;
            if (newId) {
                setElectionRoles(prev => [...prev, {
                    id: newId,
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

    const handleRemoveRole = async (electionRoleId: number, roleId?: number) => {
        if (isClosed()) return;

        if (isNew() && roleId) {
            setNewElectionRoles(prev => prev.filter(r => r.role_id !== roleId));
            return;
        }

        if (!electionData().id) return;

        const hasNominations = nominations().some(n => n.election_role_id === electionRoleId);
        if (hasNominations) {
            const ok = await showConfirmModal('Remove Role', `Are you sure you want to remove this role from the election? This will also remove <strong>all existing nominations</strong> for it.`);
            if (!ok) return;
        }

        try {
            await apiRequest('DELETE', `/api/admin/elections/${electionData().id}/roles/${electionRoleId}`);
            setElectionRoles(prev => prev.filter(er => er.id !== electionRoleId));
            setNominations(prev => prev.filter(nom => nom.election_role_id !== electionRoleId));
            notify('Success', 'Election role removed.', 'success');
        } catch (error: any) {
            notify('Error', error.message || 'Failed to remove role.', 'error');
        }
    };

    const handleUpdateMaxWinners = async (electionRoleId: number, count: number) => {
        if (isClosed()) return;
        try {
            await apiRequest('PUT', `/api/admin/elections/${electionData().id}/roles/${electionRoleId}`, { max_winners: count });
            setElectionRoles(prev => prev.map(er => er.id === electionRoleId ? { ...er, max_winners: count } : er));
            notify('Success', 'Max winners updated.', 'success');
        } catch (error: any) {
            notify('Error', error.message || 'Failed to update max winners.', 'error');
        }
    };

    const handleUpdateLocalVotes = async (nominationId: number, count: number) => {
        if (isReadOnly()) return;
        try {
            await apiRequest('PUT', `/api/admin/nominations/${nominationId}/local-votes`, { local_votes_count: count });
            setNominations(prev => prev.map(n => n.id === nominationId ? { ...n, local_votes_count: count } : n));
            notify('Success', 'Local votes updated.', 'success');
        } catch (error: any) {
            notify('Error', error.message || 'Failed to update local votes.', 'error');
        }
    };

    const handleApproveNomination = async (nominationId: number) => {
        if (isClosed()) return;
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
            ElectionUpdatedEvent.notify();
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
            await fetchElectionData(electionData().id!.toString());
        } catch (error: any) {
            notify('Error', error.message || 'Failed to calculate results.', 'error');
        }
    };

    const handleTransferRoles = async () => {
        if (!electionData().id) return;
        const ok = await showConfirmModal('Transfer Roles', 'Are you sure you want to transfer roles? This will archive the current committee and assign roles to winners.');
        if (!ok) return;
        try {
            await apiRequest('POST', `/api/admin/elections/${electionData().id}/transfer-roles`);
            notify('Success', 'Roles transferred successfully.', 'success');
            handleUpdatePhase('roles_transferred'); // Update phase after transfer
        } catch (error: any) {
            notify('Error', error.message || 'Failed to transfer roles.', 'error');
        }
    };

    const handleDelete = async () => {
        if (!electionData().id) return;
        const ok = await showConfirmModal('Delete Election', 'Are you sure you want to delete this election? This <strong>cannot be undone</strong> and will remove all nominations and votes.');
        if (!ok) return;
        try {
            await apiRequest('DELETE', `/api/admin/elections/${electionData().id}`);
            notify('Success', 'Election deleted.', 'success');
            ElectionUpdatedEvent.notify();
            props.onSave(); // Refetch list and navigate back
        } catch (error: any) {
            notify('Error', error.message || 'Failed to delete election.', 'error');
        }
    };


    return (
        <div class="glass-layout" classList={{ 'read-only': isReadOnly() }}>
            <div class="panel">
                <div class="panel-header">
                    <h3 style="margin: 0;"><FaSolidCircleInfo /> Election Overview {isReadOnly() && '(Finalized)'}</h3>
                    <div class="panel-actions">
                        <Show when={!isNew()}>
                            <button class="small-btn delete outline" onClick={handleDelete} title="Delete">
                                <FaSolidTrash /> Delete
                            </button>
                        </Show>
                    </div>
                </div>
                <div class="panel-content">
                    <form class="modern-form" onSubmit={handleSave}>
                        <Show when={electionData()} fallback={<p>Loading...</p>}>
                            <label class="form-label-top">Title
                                <input type="text" value={electionData().title || ''} onInput={(e) => updateField('title', e.currentTarget.value)} required disabled={isReadOnly()} />
                            </label>
                            <label class="form-label-top">Description
                                <RichTextEditor value={descriptionContent()} onInput={handleDescriptionInput} readOnly={isReadOnly()} />
                            </label>

                            <div class="grid-2-col">
                                <label class="form-label-top">Voting Type
                                    <select value={electionData().voting_type || 'online'} onInput={(e) => updateField('voting_type', e.currentTarget.value as Election['voting_type'])} disabled={isReadOnly()}>
                                        <option value="online">Online Only</option>
                                        <option value="hybrid">Hybrid (Online & Local)</option>
                                        <option value="in_person">Local Only (In-Person)</option>
                                    </select>
                                </label>
                            </div>

                            <Show when={(isDirty() || isNew()) && !isReadOnly()}>
                                <div class="floating-action-container">
                                    <button
                                        type="submit"
                                        class="floating-save-btn prominent-btn"
                                        title={isNew() ? 'Create Election' : 'Save Changes'}
                                    >
                                        <FaSolidFloppyDisk />
                                        <span class="btn-label">{isNew() ? 'Create' : 'Save'}</span>
                                    </button>
                                </div>
                            </Show>
                        </Show>
                    </form>
                </div>
            </div>

            <Show when={!isNew() && fetchedElection()}>
                <div class="panel">
                    <div class="panel-header">
                        <h3 style="margin: 0;"><FaSolidGear /> Phase Control</h3>
                    </div>
                    <div class="panel-content">
                        <p>Current: <span class={`badge ${phaseColors[electionData().phase || 'setup']}`}>{electionData().phase?.replace(/_/g, ' ') || 'Setup'}</span></p>
                        <div class="flex flex-wrap gap-2">
                            <button class="small-btn primary" onClick={() => handleUpdatePhase('nominations')} disabled={isClosed() || electionData().phase === 'nominations'}>Open Nominations</button>
                            <button class="small-btn primary" onClick={() => handleUpdatePhase('voting')} disabled={isClosed() || electionData().phase === 'voting'}>Open Voting</button>
                            <button class="small-btn danger" onClick={() => handleUpdatePhase('closed')} disabled={isClosed() || electionData().phase === 'closed'}>Close Election</button>
                            <button class="small-btn warning" onClick={() => handleCalculateResults()} disabled={isReadOnly() || electionData().phase !== 'closed'}>Calculate Results</button>
                            <button class="small-btn success" onClick={() => handleUpdatePhase('results_revealed')} disabled={isReadOnly() || electionData().phase !== 'closed'}>Reveal Results</button>
                            <button class="small-btn success" onClick={() => handleTransferRoles()} disabled={isReadOnly() || electionData().phase !== 'results_revealed'}>Transfer Roles</button>
                            <button class="small-btn neutral" onClick={() => handleUpdatePhase('completed')} disabled={electionData().phase !== 'roles_transferred'}>Complete Election</button>
                        </div>
                    </div>
                </div>
            </Show>

            <Show when={isNew() || fetchedElection()}>
                <div class="panel">
                    <div class="panel-header">
                        <h3 style="margin: 0;"><FaSolidTicket /> Election Roles</h3>
                    </div>
                    <div class="panel-content">
                        <Show when={!isClosed()} fallback={<p class="text-muted">Roles cannot be modified after election is closed.</p>}>
                            <div class="tags-selection-grid">
                                <For each={availableRoles()}>
                                    {(role) => {
                                        const electionRole = () => electionRoles().find(er => er.role_id === role.id);
                                        const newRole = () => newElectionRoles().find(r => r.role_id === role.id);
                                        const isSelected = () => isNew() ? !!newRole() : !!electionRole();

                                        return (
                                            <label class="tag-checkbox">
                                                <input
                                                    type="checkbox"
                                                    class="hidden-checkbox"
                                                    checked={isSelected()}
                                                    onChange={() => {
                                                        if (isNew()) {
                                                            isSelected() ? handleRemoveRole(0, role.id) : handleAddRole(role.id);
                                                        } else {
                                                            isSelected() ? handleRemoveRole(electionRole()!.id) : handleAddRole(role.id);
                                                        }
                                                    }}
                                                />
                                                <span class="tag-badge tag-badge-simple" classList={{ selected: isSelected() }} style={{ "--tag-colour": "#808080" }}>{role.name}</span>
                                            </label>
                                        );
                                    }}
                                </For>
                            </div>
                        </Show>
                    </div>
                </div>
            </Show>
            <Show when={(isNew() && newElectionRoles().length > 0) || fetchedElection()}>
                <div class="panel">
                    <div class="panel-header">
                        <h3 style="margin: 0;"><FaSolidCircleInfo /> {isNew() ? 'Selected Roles' : 'Election Roles & Nominations'}</h3>
                    </div>
                    <div class="panel-content">
                        <div class="flex-column gap-6">
                            <Show when={isNew()}>
                                <For each={newElectionRoles()}>
                                    {(role) => (
                                        <div class="election-role-section pb-4 border-bottom">
                                            <div class="flex justify-between items-center mb-3">
                                                <div class="flex items-center gap-4">
                                                    <h4 class="mb-0">{role.role_name}</h4>
                                                    <label class="form-label-inline m-0">Max Winners:
                                                        <input
                                                            type="number"
                                                            class="mini-input w-16 ml-2"
                                                            value={role.max_winners}
                                                            onInput={(e) => {
                                                                const count = parseInt(e.currentTarget.value) || 1;
                                                                setNewElectionRoles(prev => prev.map(r => r.role_id === role.role_id ? { ...r, max_winners: count } : r));
                                                            }}
                                                            min="1"
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </For>
                            </Show>
                            <For each={electionRoles()}>
                                {(electionRole) => (
                                    <div class="election-role-section pb-4 border-bottom">
                                        <div class="flex justify-between items-center mb-3">
                                            <div class="flex items-center gap-4">
                                                <h4 class="mb-0">{electionRole.role_name}</h4>
                                                <label class="form-label-inline m-0">Max Winners:
                                                    <input
                                                        type="number"
                                                        class="mini-input w-16 ml-2"
                                                        value={electionRole.max_winners}
                                                        onInput={(e) => handleUpdateMaxWinners(electionRole.id, parseInt(e.currentTarget.value) || 1)}
                                                        min="1"
                                                        disabled={isClosed()}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                        <div class="nominations-list">
                                            <Show when={nominations().filter(n => n.election_role_id === electionRole.id).length > 0} fallback={<p class="text-muted italic">No nominations yet for this role.</p>}>
                                                <div class="flex-column gap-2">
                                                    <For each={nominations().filter(n => n.election_role_id === electionRole.id)}>
                                                        {(nomination) => (
                                                            <div class="nomination-item flex items-center gap-4 p-3 rounded-lg border border-gray-200 secondary-bg">
                                                                <span class="font-bold">{nomination.first_name} {nomination.last_name}</span>
                                                                <Show when={nomination.manifesto_path}>
                                                                    <a href={nomination.manifesto_path} target="_blank" class="small-text underline">View Manifesto</a>
                                                                </Show>
                                                                <Show when={nomination.is_approved === 0 && !isClosed()}>
                                                                    <button class="small-btn primary mini-btn" onClick={() => handleApproveNomination(nomination.id)}>Approve</button>
                                                                </Show>
                                                                <Show when={nomination.is_approved === 1}>
                                                                    <span class="badge success mini-badge">Approved</span>
                                                                </Show>
                                                                <div class="flex items-center gap-4 ml-auto">
                                                                    <span class="small-text">Online: <strong>{nomination.votes_received || 0}</strong></span>
                                                                    <Show when={electionData().voting_type !== 'online'}>
                                                                        <label class="form-label-inline m-0">Local:
                                                                            <Show when={electionData().phase === 'voting' && !isReadOnly()} fallback={<span> {nomination.local_votes_count || 0}</span>}>
                                                                                <input
                                                                                    type="number"
                                                                                    class="mini-input w-20 ml-2"
                                                                                    value={nomination.local_votes_count || 0}
                                                                                    onInput={(e) => handleUpdateLocalVotes(nomination.id, parseInt(e.currentTarget.value) || 0)}
                                                                                    min="0"
                                                                                />
                                                                            </Show>
                                                                        </label>
                                                                    </Show>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </For>
                                                </div>
                                            </Show>
                                        </div>
                                    </div>
                                )}
                            </For>
                        </div>
                    </div>
                </div>
            </Show>
        </div>
    );
}

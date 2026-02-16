// src/client/pages/ElectionPage.tsx

import { createResource, For, Show, createSignal, createMemo, createEffect } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { useParams, useNavigate } from "@solidjs/router";
import Panel from "@/components/Panel";
import PageTitle from "@/components/PageTitle";
import { FiCheck } from 'solid-icons/fi'
import { RiFinanceVipCrownFill } from 'solid-icons/ri'
import Markdown from "@/components/Markdown";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/stores/auth";
import UploadWidget from "@/components/UploadWidget";
import Modal from "@/components/Modal";

interface Election {
    id: number;
    title: string;
    description?: string;
    start_date?: string;
    voting_start_date?: string;
    end_date?: string;
    voting_type?: 'online' | 'in_person' | 'hybrid';
    phase: 'setup' | 'nominations' | 'voting' | 'closed' | 'results_revealed' | 'roles_transferred' | 'completed';
    managed_by_user_id: number;
}

interface ElectionRole {
    id: number;
    election_id: number;
    role_id: number;
    role_name: string;
    role_description: string;
    max_winners: number;
}

interface Nomination {
    id: number;
    election_role_id: number;
    user_id: number;
    first_name: string;
    last_name: string;
    manifesto_file_id?: number;
    manifesto_title?: string;
    manifesto_path?: string;
    nomination_date: string;
    is_approved: boolean;
    votes_received: number;
    is_winner: boolean;
    profile_picture_color?: string;
    profile_picture_font?: string;
    profile_picture_initials?: string;
    profile_picture_path?: string;
}

interface ElectionData {
    election: Election;
    roles: ElectionRole[];
    nominations: { [election_role_id: number]: Nomination[] };
    user_nominations: { election_role_id: number, manifesto_file_id: number }[];
    user_has_voted: number[]; // Array of election_role_ids user has voted for
}

export default function ElectionPage() {
    const { notify } = useNotifications();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const [electionData, { refetch }] = createResource<ElectionData>(async () => {
        const res = await apiRequest('GET', '/api/elections/current');
        return (res.data || res) as ElectionData;
    });
    const currentElection = createMemo(() => electionData()?.election);
    const electionRoles = createMemo(() => electionData()?.roles || []);
    const nominationsByRole = createMemo(() => electionData()?.nominations || {});
    const userNominations = createMemo(() => electionData()?.user_nominations || []);
    const userHasVoted = createMemo(() => electionData()?.user_has_voted || []);

    const [nominatingRole, setNominatingRole] = createSignal<ElectionRole | null>(null);

    const isNominationsPhase = createMemo(() => currentElection()?.phase === 'nominations');
    const isVotingPhase = createMemo(() => currentElection()?.phase === 'voting');
    const isResultsPhase = createMemo(() => ['results_revealed', 'roles_transferred', 'closed', 'completed'].includes(currentElection()?.phase || ''));

    const handleNominate = async (electionRoleId: number, manifestoFileId: number) => {
        try {
            await apiRequest('POST', `/api/elections/${currentElection()?.id}/nominate`, { election_role_id: electionRoleId, manifesto_file_id: manifestoFileId });
            notify('Success', 'Nomination submitted! Awaiting approval.', 'success');
            refetch();
        } catch (e: any) {
            notify('Error', e.message, 'error');
        }
    };

    const handleVote = async (electionRoleId: number, nominationId: number) => {
        try {
            await apiRequest('POST', `/api/elections/${currentElection()?.id}/vote`, { votes: [{ election_role_id: electionRoleId, nomination_id: nominationId }] });
            notify('Success', 'Vote recorded!', 'success');
            refetch();
        } catch (e: any) {
            notify('Error', e.message, 'error');
        }
    };

    const phaseLabels: Record<string, string> = {
        'setup': 'Setting Up',
        'nominations': 'Nominations Open',
        'voting': 'Voting Open',
        'closed': 'Election Closed',
        'results_revealed': 'Results Revealed',
        'roles_transferred': 'Roles Transferred',
        'completed': 'Election Completed'
    };

    const phaseColors: Record<string, string> = {
        'setup': 'neutral',
        'nominations': 'primary',
        'voting': 'warning',
        'closed': 'danger',
        'results_revealed': 'success',
        'roles_transferred': 'success',
        'completed': 'neutral'
    };

    return (
        <div class="dashboard-container election-page">
            <main class="dashboard-content full-width">
                <Show when={currentElection()} fallback={<p aria-busy="true">Loading election...</p>}>
                    <div class="election-header-hero">
                        <span class={`badge ${phaseColors[currentElection()!.phase]}`}>{phaseLabels[currentElection()!.phase]}</span>
                        <PageTitle text={currentElection()!.title} />
                        <Markdown content={currentElection()?.description || ''} class="election-description-text" />
                    </div>

                    <Show when={isNominationsPhase()}>
                        <div class="section-intro">
                            <h2 class="text-2xl font-bold">Nominations are Open!</h2>
                            <p class="text-muted">Choose a role to nominate yourself for. You will need to upload a manifesto.</p>
                        </div>
                        <div class="election-roles-grid">
                            <For each={electionRoles()}>
                                {role => {
                                    const isNominated = () => userNominations().some(n => n.election_role_id === role.id);
                                    return (
                                        <Panel class="election-role-card">
                                            <h3 class="role-name">{role.role_name}</h3>
                                            <p class="role-description">{role.role_description}</p>
                                            <Show when={!isNominated()}>
                                                <button class="primary full-width" onClick={() => setNominatingRole(role)}>Nominate Self</button>
                                            </Show>
                                            <Show when={isNominated()}>
                                                <div class="status-msg success flex align-center gap-2">
                                                    <FiCheck /> Nominated
                                                </div>
                                            </Show>
                                        </Panel>
                                    );
                                }}
                            </For>
                        </div>
                    </Show>

                    <Show when={isVotingPhase()}>
                        <div class="section-intro">
                            <h2 class="text-2xl font-bold">Voting is Now Open!</h2>
                            <p class="text-muted">
                                {currentElection()!.voting_type === 'in_person'
                                    ? 'Online voting is disabled for this election. Please attend the AGM to cast your vote.'
                                    : 'Cast your vote for the candidates of each role.'}
                            </p>
                        </div>
                        <Show when={currentElection()!.voting_type !== 'in_person'}>
                            <div class="election-roles-grid">
                                <For each={electionRoles()}>
                                    {role => (
                                        <Panel class="election-role-card" title={role.role_name}>
                                            <p class="role-description">{role.role_description}</p>
                                            <Show when={nominationsByRole()[role.id]?.length > 0} fallback={<p class="text-muted italic">No approved nominations for this role yet.</p>}>
                                                <div class="nominations-list flex-column gap-3">
                                                    <For each={nominationsByRole()[role.id]}>
                                                        {nominee => (
                                                            <div class="nominee-card liquid-container secondary-bg flex align-center gap-4 p-3" style={{ "border-radius": "12px" }}>
                                                                <Avatar user={nominee} classes="mini" />
                                                                <div class="nominee-info flex-grow">
                                                                    <span class="nominee-name block font-bold">{nominee.first_name} {nominee.last_name}</span>
                                                                    <Show when={nominee.manifesto_path}>
                                                                        <a href={nominee.manifesto_path} target="_blank" rel="noopener noreferrer" class="small-text underline">Read Manifesto</a>
                                                                    </Show>
                                                                </div>
                                                                <Show when={!userHasVoted().includes(role.id)}>
                                                                    <button class="primary small-btn" onClick={() => handleVote(role.id, nominee.id)}>Vote</button>
                                                                </Show>
                                                                <Show when={userHasVoted().includes(role.id)}>
                                                                    <span class="badge success">Voted</span>
                                                                </Show>
                                                            </div>
                                                        )}
                                                    </For>
                                                </div>
                                            </Show>
                                        </Panel>
                                    )}
                                </For>
                            </div>
                        </Show>
                        <Show when={currentElection()!.voting_type === 'in_person'}>
                            <div class="election-roles-grid">
                                <For each={electionRoles()}>
                                    {role => (
                                        <Panel class="election-role-card" title={role.role_name}>
                                            <p class="role-description">{role.role_description}</p>
                                            <Show when={nominationsByRole()[role.id]?.length > 0} fallback={<p class="text-muted italic">No approved nominations for this role yet.</p>}>
                                                <div class="nominations-list flex-column gap-3">
                                                    <For each={nominationsByRole()[role.id]}>
                                                        {nominee => (
                                                            <div class="nominee-card liquid-container secondary-bg flex align-center gap-4 p-3" style={{ "border-radius": "12px" }}>
                                                                <Avatar user={nominee} classes="mini" />
                                                                <div class="nominee-info flex-grow">
                                                                    <span class="nominee-name block font-bold">{nominee.first_name} {nominee.last_name}</span>
                                                                    <Show when={nominee.manifesto_path}>
                                                                        <a href={nominee.manifesto_path} target="_blank" rel="noopener noreferrer" class="small-text underline">Read Manifesto</a>
                                                                    </Show>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </For>
                                                </div>
                                            </Show>
                                        </Panel>
                                    )}
                                </For>
                            </div>
                        </Show>
                    </Show>

                    <Show when={isResultsPhase()}>
                        <div class="section-intro">
                            <h2 class="text-2xl font-bold">Election Results</h2>
                            <p class="text-muted">
                                {currentElection()!.phase === 'closed'
                                    ? 'Voting has closed. Results are being verified.'
                                    : 'The winners of the election are shown below.'}
                            </p>
                        </div>

                        <div class="election-roles-grid">
                            <For each={electionRoles()}>
                                {role => (
                                    <Panel class="election-role-card" title={role.role_name}>
                                        <Show when={nominationsByRole()[role.id]?.length > 0} fallback={<p class="text-muted italic">No candidates for this role.</p>}>
                                            <div class="nominations-list flex-column gap-3">
                                                <For each={nominationsByRole()[role.id].sort((a, b) => b.votes_received - a.votes_received)}>
                                                    {nominee => (
                                                        <div class="nominee-card liquid-container flex align-center gap-4 p-3"
                                                            classList={{
                                                                'primary-glass': !!nominee.is_winner && ['results_revealed', 'roles_transferred'].includes(currentElection()!.phase),
                                                                'secondary-bg': !nominee.is_winner || !['results_revealed', 'roles_transferred'].includes(currentElection()!.phase)
                                                            }}
                                                            style={{ "border-radius": "12px" }}>
                                                            <Avatar user={nominee} classes="mini" />
                                                            <div class="nominee-info flex-grow">
                                                                <div class="flex align-center gap-2">
                                                                    <span class="nominee-name font-bold">{nominee.first_name} {nominee.last_name}</span>
                                                                    <Show when={nominee.is_winner && ['results_revealed', 'roles_transferred'].includes(currentElection()!.phase)}>
                                                                        <span class="badge primary mini-badge" style={{ "background": "var(--pico-primary)", "color": "white" }}>Winner</span>
                                                                    </Show>
                                                                </div>
                                                                <Show when={['results_revealed', 'roles_transferred'].includes(currentElection()!.phase)}>
                                                                    <span class="small-text block opacity-70">{nominee.votes_received} votes</span>
                                                                </Show>
                                                            </div>
                                                            <Show when={nominee.is_winner && ['results_revealed', 'roles_transferred'].includes(currentElection()!.phase)}>
                                                                <span class="crown-icon" style={{ "color": "gold", "width": "24px" }}><RiFinanceVipCrownFill /></span>
                                                            </Show>
                                                        </div>
                                                    )}
                                                </For>
                                            </div>
                                        </Show>
                                    </Panel>
                                )}
                            </For>
                        </div>
                    </Show>
                </Show>
            </main>

            <Show when={nominatingRole()}>
                <Modal
                    isOpen={true}
                    title={`Nominate for ${nominatingRole()?.role_name}`}
                    onClose={() => setNominatingRole(null)}
                >
                    <div class="nomination-modal-content">
                        <p class="mb-4">To nominate yourself for this role, you must upload a manifesto (PDF recommended).</p>

                        <UploadWidget
                            selectMode="single"
                            autoUpload={true}
                            onImageSelect={(file) => {
                                if (file.id) {
                                    handleNominate(nominatingRole()!.id, file.id);
                                    setNominatingRole(null);
                                }
                            }}
                        />

                        <div class="mt-4 flex justify-end">
                            <button class="secondary outline" onClick={() => setNominatingRole(null)}>Cancel</button>
                        </div>
                    </div>
                </Modal>
            </Show>
        </div>
    );
}

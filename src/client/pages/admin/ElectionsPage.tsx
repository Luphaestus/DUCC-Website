// src/client/pages/admin/ElectionsPage.tsx

import { createResource, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { useNavigate, useParams } from "@solidjs/router"; // Import useParams
import Panel from "@/components/Panel";
import PageTitle from "@/components/PageTitle";
import { FaSolidPlus } from "solid-icons/fa";
import { TabNav } from "@/widgets/TabNav"; // Not used currently, keep for future if needed
import ElectionForm from "./ElectionForm"; // Import the new ElectionForm component

interface ElectionSummary {
    id: number;
    title: string;
    description: string;
    start_date: string;
    voting_start_date: string;
    end_date: string;
    phase: 'setup' | 'nominations' | 'voting' | 'closed' | 'results_revealed' | 'roles_transferred' | 'completed';
    managed_by_user_id: number;
    created_at: string;
}

export default function AdminElectionsPage() {
    const { notify } = useNotifications();
    const navigate = useNavigate();
    const params = useParams(); // Get URL parameters
    const electionId = () => params.id; // Access the 'id' parameter

    const [elections, { refetch }] = createResource(async () => {
        const res = await apiRequest('GET', '/api/admin/elections');
        return (res.elections || []) as ElectionSummary[];
    });

    const hasActiveElection = () => elections()?.some(e => !['setup', 'completed'].includes(e.phase));

    const phaseColors = {
        'setup': 'neutral',
        'nominations': 'primary',
        'voting': 'warning',
        'closed': 'danger',
        'results_revealed': 'success',
        'roles_transferred': 'success',
        'completed': 'neutral'
    };

    return (
        <div class="dashboard-container">
            <main class="dashboard-content full-width">
                <Show when={electionId()} fallback={ // Show list if no ID, show form if ID
                    <>
                        <header class="admin-header-modern">
                            <PageTitle text="Elections" />
                            <div class="header-actions">
                                <Show when={!hasActiveElection()}>
                                    <button class="primary" onClick={() => navigate('/admin/elections/new')}>
                                        <FaSolidPlus /> New Election
                                    </button>
                                </Show>
                            </div>
                        </header>

                        <Show when={elections()} fallback={<p aria-busy="true">Loading elections...</p>}>
                            <Show when={(elections()?.length || 0) > 0} fallback={<p>No elections have been created yet.</p>}>
                                <div class="election-list-grid">
                                    <For each={elections()}>
                                        {(election) => (
                                            <div class="clickable" onClick={() => navigate(`/admin/elections/${election.id}`)}>
                                                <Panel class="election-card">
                                                    <div class="election-card-header">
                                                        <h2 class="election-title">{election.title}</h2>
                                                        <span class={`badge ${phaseColors[election.phase] || 'neutral'}`}>{election.phase.replace(/_/g, ' ')}</span>
                                                    </div>
                                                    <p class="election-description">{election.description || 'No description provided.'}</p>
                                                </Panel>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </Show>
                        </Show>
                    </>
                }>
                    {/* Render ElectionForm when an electionId is present */}
                    <ElectionForm electionId={electionId() || ''} onSave={() => {
                        refetch(); // Refetch elections list after a save
                        navigate('/admin/elections'); // Navigate back to the list
                    }} />
                </Show>
            </main>
        </div>
    );
}

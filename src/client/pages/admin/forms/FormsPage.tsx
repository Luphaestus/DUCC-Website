import { createResource, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { useNavigate } from "@solidjs/router";
import Panel from "@/components/Panel";
import {
    FaSolidPlus, FaSolidFileLines
} from 'solid-icons/fa';
import PageTitle from "@/components/PageTitle";

interface FormSummary {
    id: number;
    title: string;
    description: string;
    is_global: boolean;
    event_title?: string;
    author_name?: string;
    created_at: string;
}

export default function AdminFormsPage() {
    const { notify } = useNotifications();
    const navigate = useNavigate();

    const [forms, { refetch }] = createResource(async () => {
        const res = await apiRequest('GET', '/api/admin/forms');
        return (res.forms || []) as FormSummary[];
    });

    return (
        <div class="dashboard-container">
            <main class="dashboard-content full-width">
                <div class="flex-row-gap-1 align-center justify-between">
                    <div />
                    <button class="primary" onClick={() => navigate('/admin/forms/new')}>
                        <FaSolidPlus /> New Form
                    </button>
                </div>

                <Show when={forms()} fallback={<p aria-busy="true">Loading forms...</p>}>
                    <div class="grid-layout">
                        <For each={forms()}>
                            {form => (
                                <div class="clickable" onClick={() => navigate(`/admin/forms/${form.id}`)}>
                                    <Panel
                                        title={form.title}
                                        icon={FaSolidFileLines}
                                    >
                                        <div class="info-rows">                                        <div class="info-row">
                                            <span>Type</span>
                                            <span class={`badge ${form.is_global ? 'primary' : 'secondary'}`}>
                                                {form.is_global ? 'Global' : 'Event Linked'}
                                            </span>
                                        </div>
                                            <Show when={form.event_title}>
                                                <div class="info-row">
                                                    <span>Event</span>
                                                    <span>{form.event_title}</span>
                                                </div>
                                            </Show>
                                            <div class="info-row">
                                                <span>Created By</span>
                                                <span>{form.author_name || 'Unknown'}</span>
                                            </div>
                                            <div class="info-row">
                                                <span>Date</span>
                                                <span>{new Date(form.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </Panel>
                                </div>
                            )}
                        </For>                    </div>
                </Show>
            </main>
        </div>
    );
}

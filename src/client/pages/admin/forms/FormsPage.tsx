import { createResource, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { useNavigate } from "@solidjs/router";
import Panel from "@/components/Panel";
import { 
    ADD_SVG, DELETE_SVG, EDIT_SVG, DESCRIPTION_SVG, 
    CALENDAR_TODAY_SVG, PERSON_SVG 
} from '@/utils/icons';
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

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this form? All responses will be lost.')) return;
        try {
            await apiRequest('DELETE', `/api/admin/forms/${id}`);
            notify('Success', 'Form deleted', 'success');
            refetch();
        } catch (e: any) {
            notify('Error', e.message, 'error');
        }
    };

    return (
        <div class="dashboard-container">
            <main class="dashboard-content full-width">
                <div class="flex-row-gap-1 align-center justify-between mb-4">
                    <div />
                    <button class="primary" onClick={() => navigate('/admin/forms/new')}>
                        <span innerHTML={ADD_SVG} /> New Form
                    </button>
                </div>

                <Show when={forms()} fallback={<p aria-busy="true">Loading forms...</p>}>
                    <div class="grid-layout">
                        <For each={forms()}>
                            {form => (
                                <Panel 
                                    title={form.title} 
                                    icon={DESCRIPTION_SVG}
                                    action={
                                        <div class="flex gap-2">
                                            <button class="small-btn icon-only secondary" onClick={() => navigate(`/admin/forms/${form.id}`)}>
                                                <span innerHTML={EDIT_SVG} />
                                            </button>
                                            <button class="small-btn icon-only delete" onClick={() => handleDelete(form.id)}>
                                                <span innerHTML={DELETE_SVG} />
                                            </button>
                                        </div>
                                    }
                                >
                                    <div class="info-rows">
                                        <div class="info-row">
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
                            )}
                        </For>
                    </div>
                </Show>
            </main>
        </div>
    );
}

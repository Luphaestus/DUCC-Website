import { createResource, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNavigate } from "@solidjs/router";
import Panel from "@/components/Panel";
import { ADD_SVG, DESCRIPTION_SVG } from '@/utils/icons';

interface FormSummary {
    id: number;
    title: string;
    is_global: boolean;
    created_at: string;
}

export default function FormsTab(props: { eventId: number }) {
    const navigate = useNavigate();

    const [forms, { refetch }] = createResource(async () => {
        try {
            const res = await apiRequest('GET', '/api/admin/forms');
            // Filter only forms for this event
            return (res.forms || []).filter((f: any) => f.event_id === props.eventId) as FormSummary[];
        } catch { return []; }
    });

    const handleCreateForm = () => {
        navigate(`/admin/forms/new?event_id=${props.eventId}`);
    };

    return (
        <div class="forms-tab">
            <Panel 
                title="Event Forms" 
                icon={DESCRIPTION_SVG}
                action={
                    <button class="small-btn primary mini-btn" onClick={handleCreateForm}>
                        <span innerHTML={ADD_SVG} /> New Form
                    </button>
                }
            >
                <Show when={forms()} fallback={<p class="loading-placeholder py-4" aria-busy="true">Loading forms...</p>}>
                    <div class="forms-grid-container py-4 px-4">
                        <div class="grid-layout">
                            <For each={forms()} fallback={<p class="text-muted text-center py-4">No forms created for this event yet.</p>}>
                                {form => (
                                    <div class="clickable" onClick={() => navigate(`/admin/forms/${form.id}`)}>
                                        <Panel title={form.title} icon={DESCRIPTION_SVG} class="secondary-bg">
                                            <div class="info-rows">
                                                <div class="info-row">
                                                    <span>Created</span>
                                                    <span>{new Date(form.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </Panel>
                                    </div>
                                )}
                            </For>
                        </div>
                    </div>
                </Show>
            </Panel>
        </div>
    );
}

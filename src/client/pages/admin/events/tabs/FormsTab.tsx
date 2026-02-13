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
            <div class="flex justify-between align-center">
                <h3>Event Forms</h3>
                <button class="small-btn primary" onClick={handleCreateForm}>
                    <span innerHTML={ADD_SVG} /> New Form
                </button>
            </div>

            <Show when={forms()} fallback={<p aria-busy="true">Loading forms...</p>}>
                <div class="grid-layout">
                    <For each={forms()} fallback={<p class="text-muted">No forms created for this event yet.</p>}>
                        {form => (
                            <div class="clickable" onClick={() => navigate(`/admin/forms/${form.id}`)}>
                                <Panel title={form.title} icon={DESCRIPTION_SVG}>
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
            </Show>
        </div>
    );
}

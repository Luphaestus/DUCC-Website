import { createSignal, createResource, For, Show, createMemo } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import Panel from "@/components/Panel";
import { LIST_SVG } from '@/utils/icons';

interface FormSummary {
    id: number;
    title: string;
    description: string;
    is_global: boolean;
    event_id: number | null;
    event_title: string | null;
    event_start: string | null;
    is_closed: boolean;
    allow_multiple_responses: boolean;
    user_has_submitted: boolean;
}

export default function FormsListPage() {
    const navigate = useNavigate();

    const [forms] = createResource(async () => {
        try {
            const res = await apiRequest('GET', '/api/forms');
            return res.forms || [];
        } catch (e) {
            console.error('Failed to fetch forms:', e);
            return [];
        }
    });

    const filteredForms = createMemo(() => {
        return forms()?.filter((form: FormSummary) => !form.is_closed && (form.allow_multiple_responses || !form.user_has_submitted)) || [];
    });

    return (
        <div class="dashboard-container forms-list-container">
            <main class="dashboard-content full-width">
                <h1>Available Forms</h1>
                <Show when={forms()} fallback={<p aria-busy="true">Loading forms...</p>}>
                    <Show when={filteredForms()?.length > 0} fallback={<p>No forms available at this time.</p>}>
                        <div class="forms-grid">
                            <For each={filteredForms()}>
                                {form => (
                                    <Panel class="form-card">
                                        <div class="form-card-header">
                                            <h2 class="font-bold">{form.title}</h2>
                                            <Show when={form.is_closed}>
                                                <span class="badge danger">Closed</span>
                                            </Show>
                                        </div>
                                        <p class="form-description">{form.description || 'No description provided.'}</p>
                                        <Show when={form.event_title}>
                                            <p class="form-meta">
                                                Associated with: <span class="meta-value">{form.event_title}</span>
                                                <Show when={form.event_start}>
                                                    {' '} ({new Date(form.event_start!).toLocaleDateString()})
                                                </Show>
                                            </p>
                                        </Show>
                                        <div class="form-card-actions">
                                            <Show when={!form.is_closed} fallback={
                                                <button class="button wide-btn" disabled>Closed</button>
                                            }>
                                                <A href={`/forms/${form.id}`} class="button primary wide-btn">Fill Out Form</A>
                                            </Show>
                                        </div>
                                    </Panel>
                                )}
                            </For>
                        </div>
                    </Show>
                </Show>
            </main>
        </div>
    );
}

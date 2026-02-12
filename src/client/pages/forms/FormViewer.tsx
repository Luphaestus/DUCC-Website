import { createSignal, createResource, For, Show, createMemo, createEffect, onMount } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import Panel from "@/components/Panel";
import { DESCRIPTION_SVG, SAVE_SVG } from '@/utils/icons';
import Markdown from "@/components/Markdown";

interface Question {
    id: number;
    type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'rank' | 'date';
    prompt: string;
    options: string[];
    is_required: boolean;
    max_selections: number;
    display_order: number;
    dependency_question_id: number | null;
    dependency_value: string | null;
}

interface FormViewData {
    form: {
        id: number;
        title: string;
        description: string;
    };
    questions: Question[];
    submission?: { id: number };
    answers: { question_id: number; value: string }[];
}

export default function FormViewer() {
    const params = useParams();
    const navigate = useNavigate();
    const { notify } = useNotifications();
    
    const [answers, setAnswers] = createSignal<Record<number, any>>({});
    const [touched, setTouched] = createSignal<Record<number, boolean>>({});

    const [data] = createResource(params.id, async (id) => {
        const res = await apiRequest('GET', `/api/forms/${id}`);
        // Pre-fill answers if editing
        const initialAnswers: Record<number, any> = {};
        if (res.answers) {
            res.answers.forEach((a: any) => {
                // Parse JSON for array types
                try {
                    const q = res.questions.find((q: any) => q.id === a.question_id);
                    if (q && ['multiselect', 'rank'].includes(q.type)) {
                        initialAnswers[a.question_id] = JSON.parse(a.value);
                    } else {
                        initialAnswers[a.question_id] = a.value;
                    }
                } catch {
                    initialAnswers[a.question_id] = a.value;
                }
            });
        }
        setAnswers(initialAnswers);
        return res as FormViewData;
    });

    const isVisible = (q: Question) => {
        if (!q.dependency_question_id) return true;
        const depValue = answers()[q.dependency_question_id];
        return String(depValue) === String(q.dependency_value);
    };

    const handleInput = (qId: number, value: any) => {
        setAnswers({ ...answers(), [qId]: value });
        setTouched({ ...touched(), [qId]: true });
    };

    const handleCheckboxChange = (q: Question, opt: string, checked: boolean) => {
        const current = answers()[q.id] || [];
        const limit = q.max_selections || 0;

        if (checked) {
            if (limit === 1) {
                // Radio-like behavior: selecting one deselects others
                handleInput(q.id, [opt]);
            } else if (limit === 0 || current.length < limit) {
                // Standard multi-select with optional limit
                handleInput(q.id, [...current, opt]);
            } else {
                notify('Limit reached', `You can only select up to ${limit} options for this question.`, 'warning');
            }
        } else {
            handleInput(q.id, current.filter((v: string) => v !== opt));
        }
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        
        // Validate required fields
        const missing = data()?.questions.filter(q => isVisible(q) && q.is_required && (!answers()[q.id] || (Array.isArray(answers()[q.id]) && answers()[q.id].length === 0)));
        if (missing && missing.length > 0) {
            notify('Error', `Please answer all required questions: ${missing.map(q => q.prompt).join(', ')}`, 'error');
            return;
        }

        try {
            await apiRequest('POST', `/api/forms/${params.id}/submit`, { answers: answers() });
            notify('Success', 'Form submitted successfully!', 'success');
            navigate('/home'); // Or back to event
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    // Ranking Logic helpers
    const moveRank = (qId: number, itemIndex: number, direction: -1 | 1) => {
        const currentList = [...(answers()[qId] || [])];
        if (itemIndex + direction < 0 || itemIndex + direction >= currentList.length) return;
        const temp = currentList[itemIndex];
        currentList[itemIndex] = currentList[itemIndex + direction];
        currentList[itemIndex + direction] = temp;
        handleInput(qId, currentList);
    };

    return (
        <div class="dashboard-container">
            <main class="dashboard-content full-width">
                <Show when={data()} fallback={<p aria-busy="true">Loading form...</p>}>
                    <form onSubmit={handleSubmit} class="modern-form max-w-2xl mx-auto">
                        <div class="text-center mb-8">
                            <h1 class="text-2xl font-bold mb-2">{data()?.form.title}</h1>
                            <Markdown content={data()?.form.description || ''} class="text-sm opacity-80" />
                        </div>

                        <For each={data()?.questions}>
                            {q => (
                                <Show when={isVisible(q)}>
                                    <Panel class="mb-4">
                                        <label class="block mb-2 font-semibold">
                                            {q.prompt}
                                            {q.is_required && <span class="text-red-500 ml-1">*</span>}
                                            <Show when={q.type === 'multiselect' && q.max_selections > 1}>
                                                <small class="ml-2 opacity-60">(Select up to {q.max_selections})</small>
                                            </Show>
                                        </label>

                                        <Show when={q.type === 'text'}>
                                            <input type="text" value={answers()[q.id] || ''} onInput={e => handleInput(q.id, e.currentTarget.value)} required={q.is_required} />
                                        </Show>

                                        <Show when={q.type === 'textarea'}>
                                            <textarea rows="3" value={answers()[q.id] || ''} onInput={e => handleInput(q.id, e.currentTarget.value)} required={q.is_required}></textarea>
                                        </Show>

                                        <Show when={q.type === 'number'}>
                                            <input type="number" value={answers()[q.id] || ''} onInput={e => handleInput(q.id, e.currentTarget.value)} required={q.is_required} />
                                        </Show>

                                        <Show when={q.type === 'select'}>
                                            <select value={answers()[q.id] || ''} onChange={e => handleInput(q.id, e.currentTarget.value)} required={q.is_required}>
                                                <option value="">Select an option...</option>
                                                <For each={q.options}>{opt => <option value={opt}>{opt}</option>}</For>
                                            </select>
                                        </Show>

                                        <Show when={q.type === 'multiselect'}>
                                            <div class="flex flex-col gap-2">
                                                <For each={q.options}>
                                                    {opt => (
                                                        <label class="checkbox-label flex items-center gap-2 cursor-pointer">
                                                            <input type="checkbox" 
                                                                checked={(answers()[q.id] || []).includes(opt)} 
                                                                onChange={e => handleCheckboxChange(q, opt, e.currentTarget.checked)} 
                                                            />
                                                            {opt}
                                                        </label>
                                                    )}
                                                </For>
                                            </div>
                                        </Show>

                                        <Show when={q.type === 'rank'}>
                                            <div class="ranking-list flex flex-col gap-2">
                                                <For each={answers()[q.id] || q.options}>
                                                    {(item, idx) => (
                                                        <div class="rank-item bg-alt p-2 rounded flex justify-between items-center border border-gray-200 dark:border-gray-700">
                                                            <span>{idx() + 1}. {item}</span>
                                                            <div class="flex gap-1">
                                                                <button type="button" class="small-btn icon-only" onClick={() => moveRank(q.id, idx(), -1)} disabled={idx() === 0}>↑</button>
                                                                <button type="button" class="small-btn icon-only" onClick={() => moveRank(q.id, idx(), 1)} disabled={idx() === (answers()[q.id] || q.options).length - 1}>↓</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </For>
                                                <Show when={!answers()[q.id]}>
                                                    <div style="display:none">
                                                        {(() => {
                                                            onMount(() => {
                                                                if (!answers()[q.id]) handleInput(q.id, q.options);
                                                            });
                                                            return null;
                                                        })()}
                                                    </div>
                                                </Show>
                                            </div>
                                        </Show>

                                        <Show when={q.type === 'date'}>
                                            <input type="date" value={answers()[q.id] || ''} onInput={e => handleInput(q.id, e.currentTarget.value)} required={q.is_required} />
                                        </Show>
                                    </Panel>
                                </Show>
                            )}
                        </For>

                        <button type="submit" class="primary full-width mt-6 text-lg py-3"><span innerHTML={SAVE_SVG} /> Submit Response</button>
                    </form>
                </Show>
            </main>
        </div>
    );
}

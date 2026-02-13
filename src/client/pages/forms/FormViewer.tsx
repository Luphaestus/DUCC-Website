import { createSignal, createResource, For, Show, onMount, Switch, Match, createMemo } from "solid-js";
import { useParams, useNavigate, A } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import Panel from "@/components/Panel";
import { DESCRIPTION_SVG, SAVE_SVG, ARROW_BACK_IOS_NEW_SVG } from '@/utils/icons';
import Markdown from "@/components/Markdown";
import { FormSubmittedEvent } from "@/utils/events/events";
import { smartDateAdjust } from "@/utils/utils";

interface Question {
    id: number;
    type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'rank' | 'date';
    prompt: string;
    description?: string;
    options: string[];
    is_required: boolean;
    max_selections: number;
    display_order: number;
    page_id: number;
    dependency_question_id: number | null;
    dependency_operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'was_visible' | 'regex' | 'is_one_of';
    dependency_value: string | null;
}

interface FormPage {
    id: number;
    title: string;
    description: string;
    display_order: number;
}

interface FormViewData {
    form: {
        id: number;
        title: string;
        description: string;
        allow_multiple_responses: boolean;
        user_has_submitted: boolean;
    };
    pages: FormPage[];
    questions: Question[];
    submission?: { id: number };
    answers: { question_id: number; value: string }[];
    is_closed: boolean;
}

export default function FormViewer() {
    const params = useParams();
    const navigate = useNavigate();
    const { notify } = useNotifications();

    const [answers, setAnswers] = createSignal<Record<number, any>>({});
    const [touched, setTouched] = createSignal<Record<number, boolean>>({});
    const [currentPageIdx, setCurrentPageIdx] = createSignal(0);

    const [data] = createResource(params.id, async (id) => {
        const res = await apiRequest('GET', `/api/forms/${id}`);
        const initialAnswers: Record<number, any> = {};
        if (res.answers) {
            res.answers.forEach((a: any) => {
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

    const isVisible = (q: Question): boolean => {
        if (q.dependency_question_id === null || q.dependency_question_id === undefined) return true;

        const parentQ = data()?.questions.find(pq => pq.id === q.dependency_question_id);
        if (parentQ && !isVisible(parentQ)) return false;

        const depValue = answers()[q.dependency_question_id];
        const targetValue = q.dependency_value;
        const operator = q.dependency_operator || 'equals';

        if (operator === 'was_visible') return true;

        if (depValue === undefined || depValue === null || depValue === '') {
            return operator === 'not_equals';
        }

        switch (operator) {
            case 'equals':
                return String(depValue) === String(targetValue);
            case 'not_equals':
                return String(depValue) !== String(targetValue);
            case 'contains':
                if (Array.isArray(depValue)) return depValue.includes(targetValue!);
                return String(depValue).toLowerCase().includes(String(targetValue).toLowerCase());
            case 'greater_than':
                return Number(depValue) > Number(targetValue);
            case 'less_than':
                return Number(depValue) < Number(targetValue);
            case 'is_one_of':
                const allowed = (targetValue || '').split(',').filter(Boolean);
                if (Array.isArray(depValue)) return depValue.some(v => allowed.includes(v));
                return allowed.includes(String(depValue));
            case 'regex':
                try {
                    const re = new RegExp(targetValue || '');
                    return re.test(String(depValue));
                } catch { return false; }
            default:
                return true;
        }
    };

    const handleInput = (qId: number, value: any) => {
        setAnswers({ ...answers(), [qId]: value });
        setTouched({ ...touched(), [qId]: true });
    };

    const handleCheckboxChange = (q: Question, opt: string, checked: boolean) => {
        const current = (answers()[q.id] || []) as string[];
        const limit = q.max_selections || 0;

        if (checked) {
            if (limit === 1) {
                handleInput(q.id, [opt]);
            } else if (limit === 0 || current.length < limit) {
                handleInput(q.id, [...current, opt]);
            } else {
                notify('Limit reached', `You can only select up to ${limit} options.`, 'warning');
            }
        } else {
            handleInput(q.id, current.filter((v: string) => v !== opt));
        }
    };

    const sortedPages = createMemo(() => {
        return [...(data()?.pages || [])].sort((a, b) => a.display_order - b.display_order);
    });

    const currentPage = () => sortedPages()[currentPageIdx()];
    const isLastPage = () => currentPageIdx() === sortedPages().length - 1;
    const isFirstPage = () => currentPageIdx() === 0;

    const questionsOnCurrentPage = () => {
        const page = currentPage();
        if (!page) return [];
        return data()?.questions.filter(q => q.page_id === page.id) || [];
    };

    const validateCurrentPage = () => {
        const missing = questionsOnCurrentPage().filter(q =>
            isVisible(q) && q.is_required && (
                !answers()[q.id] ||
                (Array.isArray(answers()[q.id]) && answers()[q.id].length === 0) ||
                (typeof answers()[q.id] === 'string' && answers()[q.id].trim() === '')
            )
        );

        if (missing.length > 0) {
            notify('Missing Required Fields', `Please answer: ${missing.map(q => q.prompt).join(', ')}`, 'error');
            return false;
        }
        return true;
    };

    const handleNext = () => {
        if (validateCurrentPage()) {
            setCurrentPageIdx(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrev = () => {
        setCurrentPageIdx(prev => prev - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!validateCurrentPage()) return;

        try {
            await apiRequest('POST', `/api/forms/${params.id}/submit`, { answers: answers() });
            notify('Success', 'Form submitted successfully!', 'success');
            FormSubmittedEvent.notify();
            navigate('/home');
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    const moveRank = (qId: number, itemIndex: number, direction: -1 | 1) => {
        const currentList = [...(answers()[qId] || [])];
        if (itemIndex + direction < 0 || itemIndex + direction >= currentList.length) return;
        const temp = currentList[itemIndex];
        currentList[itemIndex] = currentList[itemIndex + direction];
        currentList[itemIndex + direction] = temp;
        handleInput(qId, currentList);
    };

    return (
        <div class="dashboard-container form-viewer-container">
            <main class="dashboard-content full-width">
                <Show when={data()} fallback={<p aria-busy="true">Loading form...</p>}>
                    <Show when={!data()?.is_closed} fallback={
                        <div class="form-closed-container">
                            <h1 class="font-bold">{data()?.form.title}</h1>
                            <Panel class="closed-panel secondary-bg">
                                <h2 class="text-xl">This form is now closed</h2>
                                <p>Submissions are no longer being accepted for this form.</p>
                                <div class="closed-actions">
                                    <A href="/home" class="button primary">Return Home</A>
                                </div>
                            </Panel>
                        </div>
                    }>
                        <Show when={!data()?.form.user_has_submitted || data()?.form.allow_multiple_responses} fallback={
                            <div class="form-closed-container">
                                <h1 class="font-bold">{data()?.form.title}</h1>
                                <Panel class="closed-panel secondary-bg">
                                    <h2 class="text-xl">You have already submitted this form.</h2>
                                    <p>This form does not allow multiple submissions.</p>
                                    <div class="closed-actions">
                                        <A href="/home" class="button primary">Return Home</A>
                                    </div>
                                </Panel>
                            </div>
                        }>
                            <form onSubmit={handleSubmit} class="modern-form">
                                <div class="form-header">
                                    <h1 class="font-bold">{data()?.form.title}</h1>
                                    <Markdown content={data()?.form.description || ''} class="form-description" />

                                    <Show when={sortedPages().length > 1}>
                                        <div class="form-progress">
                                            <div class="progress-bar-wrapper">
                                                <div class="progress-bar-fill" style={{ width: `${((currentPageIdx() + 1) / sortedPages().length) * 100}%` }}></div>
                                            </div>
                                            <span class="progress-text">Page {currentPageIdx() + 1} of {sortedPages().length}</span>
                                        </div>
                                    </Show>
                                </div>

                                <div class="current-page-content">
                                    <Show when={currentPage()}>
                                        <div class="page-intro">
                                            <h2 class="text-xl font-bold">{currentPage()?.title}</h2>
                                            <Show when={currentPage()?.description}>
                                                <Markdown content={currentPage()?.description} class="page-description" />
                                            </Show>
                                        </div>
                                    </Show>

                                    <For each={questionsOnCurrentPage()}>
                                        {q => (
                                            <Show when={isVisible(q)}>
                                                <Panel class="form-question-panel">
                                                    <label class="font-bold block">
                                                        {q.prompt}
                                                        {q.is_required && <span class="required-star">*</span>}
                                                        <Show when={q.type === 'multiselect' && q.max_selections > 1}>
                                                            <small class="selection-limit">(Select up to {q.max_selections})</small>
                                                        </Show>
                                                    </label>

                                                    <Show when={q.description}>
                                                        <Markdown content={q.description!} class="question-description small-text opacity-80" />
                                                    </Show>

                                                    <Switch>
                                                        <Match when={q.type === 'text'}>
                                                            <input type="text" value={answers()[q.id] || ''} onInput={e => handleInput(q.id, e.currentTarget.value)} required={q.is_required} />
                                                        </Match>
                                                        <Match when={q.type === 'textarea'}>
                                                            <textarea rows="3" value={answers()[q.id] || ''} onInput={e => handleInput(q.id, e.currentTarget.value)} required={q.is_required}></textarea>
                                                        </Match>
                                                        <Match when={q.type === 'number'}>
                                                            <input type="number" value={answers()[q.id] || ''} onInput={e => handleInput(q.id, e.currentTarget.value)} required={q.is_required} />
                                                        </Match>
                                                        <Match when={q.type === 'select'}>
                                                            <select value={answers()[q.id] || ''} onChange={e => handleInput(q.id, e.currentTarget.value)} required={q.is_required}>
                                                                <option value="">Select an option...</option>
                                                                <For each={q.options}>{opt => <option value={opt}>{opt}</option>}</For>
                                                            </select>
                                                        </Match>
                                                        <Match when={q.type === 'multiselect'}>
                                                            <div class="flex-column gap-2">
                                                                <For each={q.options}>
                                                                    {opt => (
                                                                        <label class="checkbox-label flex align-center gap-2">
                                                                            <input type="checkbox"
                                                                                checked={(answers()[q.id] || []).includes(opt)}
                                                                                disabled={!((answers()[q.id] || []).includes(opt)) && (answers()[q.id] || []).length >= q.max_selections && q.max_selections > 1}
                                                                                onChange={e => handleCheckboxChange(q, opt, e.currentTarget.checked)}
                                                                            />
                                                                            {opt}
                                                                        </label>
                                                                    )}
                                                                </For>
                                                            </div>
                                                        </Match>
                                                        <Match when={q.type === 'rank'}>
                                                            <div class="ranking-list">
                                                                <For each={answers()[q.id] || q.options}>
                                                                    {(item, idx) => (
                                                                        <div class="rank-item bg-alt rounded flex justify-between align-center p-3">
                                                                            <span>{idx() + 1}. {item}</span>
                                                                            <div class="rank-actions flex gap-1">
                                                                                <button type="button" class="small-btn icon-only secondary" onClick={() => moveRank(q.id, idx(), -1)} disabled={idx() === 0}>↑</button>
                                                                                <button type="button" class="small-btn icon-only secondary" onClick={() => moveRank(q.id, idx(), 1)} disabled={idx() === (answers()[q.id] || q.options).length - 1}>↓</button>
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
                                                        </Match>
                                                        <Match when={q.type === 'date'}>
                                                            <input type="date" value={answers()[q.id] || ''} onChange={e => {
                                                                const { date, valid } = smartDateAdjust(e.currentTarget.value);
                                                                if (valid) handleInput(q.id, date.toISOString().split('T')[0]);
                                                            }} onFocus={e => {
                                                                if (!e.currentTarget.value) {
                                                                    handleInput(q.id, new Date().toISOString().split('T')[0]);
                                                                }
                                                            }} required={q.is_required} />
                                                        </Match>
                                                    </Switch>
                                                </Panel>
                                            </Show>
                                        )}
                                    </For>
                                </div>

                                <div class="form-navigation flex justify-between pt-4 border-top">
                                    <Show when={!isFirstPage()}>
                                        <button type="button" class="secondary" onClick={handlePrev}>
                                            <span innerHTML={ARROW_BACK_IOS_NEW_SVG} /> Previous
                                        </button>
                                    </Show>
                                    <div class="flex-grow"></div>
                                    <Show when={!isLastPage()}>
                                        <button type="button" class="primary" onClick={handleNext}>
                                            Next Page
                                        </button>
                                    </Show>
                                    <Show when={isLastPage()}>
                                        <button type="submit" class="primary form-submit-btn">
                                            <span innerHTML={SAVE_SVG} /> Submit Response
                                        </button>
                                    </Show>
                                </div>
                            </form>
                        </Show>
                    </Show>
                </Show>
            </main>
        </div>
    );
}

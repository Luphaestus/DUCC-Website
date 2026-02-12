import { createSignal, createResource, For, Show, createMemo, Index } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import Panel from "@/components/Panel";
import { 
    SAVE_SVG, ADD_SVG, DELETE_SVG, ARROW_DROP_UP_SVG, 
    SETTINGS_SVG, DESCRIPTION_SVG, CLOSE_SVG,
    RADIO_BUTTON_UNCHECKED_SVG, CHECK_BOX_OUTLINE_BLANK_SVG, LIST_SVG
} from '@/utils/icons';

interface Question {
    id?: number;
    type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'rank' | 'date';
    prompt: string;
    options: string[]; // For select/radio/rank
    is_required: boolean;
    max_selections: number;
    display_order: number;
    dependency_question_id?: number | null;
    dependency_value?: string | null;
}

interface FormData {
    id?: number;
    title: string;
    description: string;
    is_global: boolean;
    event_id: number | null;
    questions: Question[];
}

export default function FormEditor() {
    const params = useParams();
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const isNew = () => params.id === 'new';

    const [form, setForm] = createSignal<FormData>({
        title: '',
        description: '',
        is_global: true,
        event_id: null,
        questions: []
    });

    const [events] = createResource(async () => {
        try {
            const res = await apiRequest('GET', '/api/admin/events?limit=100');
            return res.events || [];
        } catch { return []; }
    });

    const [loading] = createResource(params.id, async (id) => {
        if (id === 'new') return;
        const res = await apiRequest('GET', `/api/admin/forms/${id}`);
        setForm({
            ...res.form,
            is_global: res.form.is_global === 1,
            questions: res.questions.map((q: any) => ({
                ...q,
                options: q.options ? JSON.parse(q.options) : [],
                is_required: q.is_required === 1
            }))
        });
    });

    const addQuestion = () => {
        setForm({
            ...form(),
            questions: [
                ...form().questions,
                { type: 'text', prompt: '', options: [''], is_required: false, max_selections: 1, display_order: form().questions.length }
            ]
        });
    };

    const updateQuestion = (index: number, field: keyof Question, value: any) => {
        const newQuestions = [...form().questions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        
        // Ensure at least one empty option if type is changed to a choice type
        if (field === 'type' && ['select', 'multiselect', 'rank'].includes(value)) {
            if (newQuestions[index].options.length === 0) {
                newQuestions[index].options = [''];
            }
        }

        setForm({ ...form(), questions: newQuestions });
    };

    const updateOption = (qIdx: number, optIdx: number, value: string) => {
        const newQuestions = [...form().questions];
        const newOptions = [...newQuestions[qIdx].options];
        newOptions[optIdx] = value;

        // If typing in the last option, add a new empty one
        if (optIdx === newOptions.length - 1 && value.trim() !== '') {
            newOptions.push('');
        }

        newQuestions[qIdx] = { ...newQuestions[qIdx], options: newOptions };
        setForm({ ...form(), questions: newQuestions });
    };

    const removeOption = (qIdx: number, optIdx: number) => {
        const newQuestions = [...form().questions];
        const newOptions = newQuestions[qIdx].options.filter((_, i) => i !== optIdx);
        
        // Always maintain at least one empty option
        if (newOptions.length === 0) newOptions.push('');
        
        newQuestions[qIdx] = { ...newQuestions[qIdx], options: newOptions };
        setForm({ ...form(), questions: newQuestions });
    };

    const removeQuestion = (index: number) => {
        const newQuestions = form().questions.filter((_, i) => i !== index);
        setForm({ ...form(), questions: newQuestions });
    };

    const moveQuestion = (index: number, direction: -1 | 1) => {
        const newQuestions = [...form().questions];
        if (index + direction < 0 || index + direction >= newQuestions.length) return;
        
        const temp = newQuestions[index];
        newQuestions[index] = newQuestions[index + direction];
        newQuestions[index + direction] = temp;
        
        setForm({ ...form(), questions: newQuestions });
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        try {
            // Clean up empty options before saving
            const cleanedQuestions = form().questions.map(q => ({
                ...q,
                options: q.options.map(o => o.trim()).filter(Boolean)
            }));

            const payload = { ...form(), questions: cleanedQuestions };
            const res = await apiRequest(isNew() ? 'POST' : 'PUT', isNew() ? '/api/admin/forms' : `/api/admin/forms/${form().id}`, payload);
            notify('Success', 'Form saved', 'success');
            if (isNew()) navigate(`/admin/forms/${res.id}`);
        } catch (e: any) {
            notify('Error', e.message, 'error');
        }
    };

    const getOptionIcon = (type: string) => {
        if (type === 'multiselect') return CHECK_BOX_OUTLINE_BLANK_SVG;
        if (type === 'rank') return '<span style="font-weight: 800; opacity: 0.5;">#</span>';
        return '<span style="font-weight: 800; opacity: 0.5;">•</span>';
    };

    return (
        <div class="dashboard-container">
            <main class="dashboard-content full-width">
                <form onSubmit={handleSubmit} class="modern-form">
                    <div class="flex-row-gap-1 align-center justify-between mb-4">
                        <h2 class="text-xl m-0">{isNew() ? 'New Form' : 'Edit Form'}</h2>
                    </div>

                    <Panel title="Form Settings" icon={SETTINGS_SVG}>
                        <div class="modern-form-group">
                            <label class="form-label-top">Form Title
                                <input type="text" class="title-input" value={form().title} onInput={e => setForm({...form(), title: e.currentTarget.value})} required placeholder="e.g. Attendance Waiver" />
                            </label>
                        </div>
                        <label>Description
                            <textarea rows="2" value={form().description} onInput={e => setForm({...form(), description: e.currentTarget.value})} placeholder="What is this form for?"></textarea>
                        </label>
                        <div class="grid-2-col">
                            <label class="checkbox-label pt-4">
                                <input type="checkbox" checked={form().is_global} onChange={e => setForm({...form(), is_global: e.currentTarget.checked})} />
                                Standalone Global Form
                            </label>
                            <Show when={!form().is_global}>
                                <label>Attached Event
                                    <select value={form().event_id || ''} onChange={e => setForm({...form(), event_id: parseInt(e.currentTarget.value) || null})}>
                                        <option value="">Select Event...</option>
                                        <For each={events()}>
                                            {evt => <option value={evt.id}>{evt.title} ({new Date(evt.start).toLocaleDateString()})</option>}
                                        </For>
                                    </select>
                                </label>
                            </Show>
                        </div>
                    </Panel>

                    <div class="mt-6">
                        <div class="flex-row-gap-1 align-center justify-between mb-4">
                            <h3 class="text-lg m-0">Form Questions</h3>
                            <button type="button" class="small-btn secondary" onClick={addQuestion}><span innerHTML={ADD_SVG} /> Add Question</button>
                        </div>

                        <Index each={form().questions}>
                            {(q, i) => (
                                <Panel 
                                    class="mb-6" 
                                    title={
                                        <div class="flex align-center gap-4">
                                            <span>Question {i + 1}</span>
                                            <label class="checkbox-label m-0" style={{ "font-size": "0.8rem", "text-transform": "none", "letter-spacing": "normal", "font-weight": "500", "opacity": "0.8" }}>
                                                <input type="checkbox" checked={q().is_required} onChange={e => updateQuestion(i, 'is_required', e.currentTarget.checked)} />
                                                Required
                                            </label>
                                        </div>
                                    }
                                    action={
                                        <div class="flex gap-2">
                                            <button type="button" class="small-btn icon-only secondary" style="width: 28px; height: 28px; min-height: 0 !important;" title="Move Up" onClick={() => moveQuestion(i, -1)} disabled={i === 0}>↑</button>
                                            <button type="button" class="small-btn icon-only secondary" style="width: 28px; height: 28px; min-height: 0 !important;" title="Move Down" onClick={() => moveQuestion(i, 1)} disabled={i === form().questions.length - 1}>↓</button>
                                            <button type="button" class="small-btn icon-only delete" style="width: 28px; height: 28px; min-height: 0 !important;" title="Remove Question" onClick={() => removeQuestion(i)}><span innerHTML={DELETE_SVG} /></button>
                                        </div>
                                    }
                                >
                                    <div class="grid-2-col">
                                        <label>Question Prompt
                                            <input type="text" value={q().prompt} onInput={e => updateQuestion(i, 'prompt', e.currentTarget.value)} required placeholder="e.g. Do you have any dietary requirements?" />
                                        </label>
                                        <label>Response Type
                                            <select value={q().type} onChange={e => updateQuestion(i, 'type', e.currentTarget.value as any)}>
                                                <option value="text">Short Text</option>
                                                <option value="textarea">Long Text</option>
                                                <option value="number">Number</option>
                                                <option value="select">Dropdown Menu</option>
                                                <option value="multiselect">Checkbox List</option>
                                                <option value="rank">Ranking / Priority</option>
                                                <option value="date">Date Picker</option>
                                            </select>
                                        </label>
                                    </div>

                                    <Show when={q().type === 'multiselect'}>
                                        <div class="mt-4">
                                            <label>Max Selections (0 = unlimited)
                                                <input type="number" min="0" value={q().max_selections} onInput={e => updateQuestion(i, 'max_selections', parseInt(e.currentTarget.value) || 0)} />
                                            </label>
                                        </div>
                                    </Show>

                                    <Show when={['select', 'multiselect', 'rank'].includes(q().type)}>
                                        <div class="options-builder-container mt-4">
                                            <label class="mb-2 block font-weight-600">Choices</label>
                                            <div class="options-list flex flex-column gap-2">
                                                <Index each={q().options}>
                                                    {(opt, optIdx) => (
                                                        <div class="flex gap-2" style={{ "align-items": "center" }}>
                                                            <div class="option-type-icon" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;" innerHTML={getOptionIcon(q().type)} />
                                                            <input 
                                                                type="text" 
                                                                class="compact-input"
                                                                style="margin-bottom: 0; flex: 1;"
                                                                value={opt()} 
                                                                onInput={e => updateOption(i, optIdx, e.currentTarget.value)} 
                                                                placeholder={`Option ${optIdx + 1}...`}
                                                            />
                                                            <Show when={q().options.length > 1}>
                                                                <button type="button" class="icon-btn delete" style="margin-bottom: 0;" onClick={() => removeOption(i, optIdx)} innerHTML={CLOSE_SVG} />
                                                            </Show>
                                                        </div>
                                                    )}
                                                </Index>
                                            </div>
                                        </div>
                                    </Show>
                                    
                                    <Show when={i > 0}>
                                        <div class="logic-gate mt-4 p-4 liquid-container secondary-bg" style={{ "--liquid-padding": "1rem" }}>
                                            <p class="text-sm mb-2"><strong>Conditional Logic:</strong> Display this question only if...</p>
                                            <div class="grid-2-col">
                                                <label class="m-0">Previous Question
                                                    <select 
                                                        value={q().dependency_question_id || ''} 
                                                        onChange={e => updateQuestion(i, 'dependency_question_id', parseInt(e.currentTarget.value) || null)}
                                                    >
                                                        <option value="">(Always Visible)</option>
                                                        <For each={form().questions.filter((_, idx) => idx < i)}>
                                                            {(prevQ, prevIdx) => <option value={prevQ.id || prevIdx()}>Q{prevIdx() + 1}: {prevQ.prompt.substring(0, 40)}...</option>}
                                                        </For>
                                                    </select>
                                                </label>
                                                <label class="m-0">Value matches
                                                    <input 
                                                        type="text" 
                                                        value={q().dependency_value || ''} 
                                                        onInput={e => updateQuestion(i, 'dependency_value', e.currentTarget.value)} 
                                                        placeholder="e.g. Yes"
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </Show>
                                </Panel>
                            )}
                        </Index>
                    </div>

                    <div class="form-actions-sticky mt-8">
                        <button type="submit" class="wide-btn primary full-width"><span innerHTML={SAVE_SVG} /> Save Form</button>
                    </div>
                </form>
            </main>
        </div>
    );
}

import { createSignal, createResource, For, Show, createMemo, Index, Switch, Match, onMount } from "solid-js";
import { useParams, useNavigate, useLocation, useBeforeLeave } from "@solidjs/router";
import { Dynamic } from "solid-js/web";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import Panel from "@/components/Panel";
import { 
    FaSolidFloppyDisk, FaSolidPlus, FaSolidTrash, FaSolidArrowUp, FaSolidArrowDown,
    FaSolidGear, FaSolidFileLines, FaSolidXmark,
    FaSolidCircle, FaSolidSquare, FaSolidList,
    FaSolidListUl, FaSolidShieldHalved
} from 'solid-icons/fa';
import { TabNav } from "@/widgets/TabNav";
import SubmissionsTab from "./tabs/SubmissionsTab";
import RichTextEditor from "@/components/RichTextEditor";
import { showConfirmModal } from "@/utils/modal";

interface Question {
    id?: number;
    clientId: string;
    type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'rank' | 'date';
    prompt: string;
    description: string;
    options: string[];
    is_required: boolean;
    max_selections: number;
    display_order: number;
    dependency_question_id: string | null;
    dependency_operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'was_visible' | 'regex' | 'is_one_of';
    dependency_value: string | null;
}

interface FormPage {
    id?: number;
    title: string;
    description: string;
    questions: Question[];
}

interface FormData {
    id?: number;
    title: string;
    description: string;
    is_global: boolean;
    event_id: number | null;
    expires_at: string | null;
    allow_multiple_responses?: boolean;
    pages: FormPage[];
    visibility_tags: number[];
    visibility_roles: number[];
    visibility_permissions: number[];
    management_roles: number[];
    management_permissions: number[];
}

export default function FormEditor() {
    const params = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { notify } = useNotifications();
    const isNew = () => params.id === 'new';
    const formId = () => params.id;

    const [activeTab, setActiveTab] = createSignal<'editor' | 'submissions'>('editor');
    const [accessTab, setAccessTab] = createSignal<'visibility' | 'management'>('visibility');
    const [visibilityType, setVisibilityType] = createSignal<'tags' | 'roles' | 'permissions'>('tags');
    const [managementType, setManagementType] = createSignal<'roles' | 'permissions'>('roles');
    const [isDirty, setIsDirty] = createSignal(false);

    useBeforeLeave(async (e) => {
        if (isDirty()) {
            e.preventDefault();
            const confirmed = await showConfirmModal(
                "Unsaved Changes",
                "You have unsaved changes. Are you sure you want to leave? Your progress will be lost."
            );
            if (confirmed) {
                setIsDirty(false);
                if (typeof e.retry === 'function') e.retry();
            }
        }
    });

    const generateClientId = () => Math.random().toString(36).substring(2, 15);

    const createNewQuestion = (order: number): Question => ({
        clientId: generateClientId(),
        type: 'text', 
        prompt: '', 
        description: '',
        options: [''], 
        is_required: false, 
        max_selections: 1, 
        display_order: order,
        dependency_question_id: null,
        dependency_operator: 'equals',
        dependency_value: null
    });

    const [form, setFormState] = createSignal<FormData>({
        title: '',
        description: '',
        is_global: !location.query.event_id,
        event_id: location.query.event_id ? parseInt(location.query.event_id as string) : null,
        expires_at: null,
        allow_multiple_responses: false,
        pages: [{
            title: 'Page 1',
            description: '',
            questions: [createNewQuestion(0)]
        }],
        visibility_tags: [],
        visibility_roles: [],
        visibility_permissions: [],
        management_roles: [],
        management_permissions: []
    });

    const setForm = (data: FormData) => {
        setFormState(data);
        setIsDirty(true);
    };

    const [events] = createResource(async () => {
        try {
            const res = await apiRequest('GET', '/api/admin/events?limit=100');
            return res.events || [];
        } catch { return []; }
    });

    const [tags] = createResource(async () => {
        try {
            const res = await apiRequest('GET', '/api/tags');
            return res.data || [];
        } catch { return []; }
    });

    const [roles] = createResource(async () => {
        try {
            const res = await apiRequest('GET', '/api/admin/roles');
            return res || [];
        } catch { return []; }
    });

    const [permissions] = createResource(async () => {
        try {
            const res = await apiRequest('GET', '/api/admin/roles/permissions');
            return res || [];
        } catch { return []; }
    });

    const [loading] = createResource(params.id, async (id) => {
        if (id === 'new') return;
        const res = await apiRequest('GET', `/api/admin/forms/${id}`);
        if (res && res.form && res.questions) {
            // Group questions by page
            const pages: FormPage[] = (res.pages || [{ id: null, title: 'Default Page', description: '', display_order: 0 }]).map((p: any) => ({
                id: p.id,
                title: p.title || '',
                description: p.description || '',
                questions: res.questions
                    .filter((q: any) => q.page_id === p.id || (!p.id && !q.page_id))
                    .map((q: any) => ({
                        ...q,
                        clientId: String(q.id),
                        options: q.options || [],
                        is_required: q.is_required === 1,
                        description: q.description || '',
                        dependency_operator: q.dependency_operator || 'equals',
                        dependency_question_id: q.dependency_question_id ? String(q.dependency_question_id) : null
                    }))
            }));

            setFormState({
                ...res.form,
                is_global: res.form.is_global === 1,
                expires_at: res.form.expires_at ? new Date(res.form.expires_at).toISOString().split('.')[0].slice(0, 16) : null,
                allow_multiple_responses: res.form.allow_multiple_responses === 1,
                pages: pages,
                visibility_tags: res.form.visibility_tags || [],
                visibility_roles: res.form.visibility_roles || [],
                visibility_permissions: res.form.visibility_permissions || [],
                management_roles: res.form.management_roles || [],
                management_permissions: res.form.management_permissions || []
            });
            setIsDirty(false);
        } else {
            console.error('API response for form not valid:', res);
            notify('Error', 'Failed to load form data.', 'error');
        }
    });

    const toggleArrayItem = (field: keyof FormData, value: number) => {
        const current = (form() as any)[field] as number[];
        const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
        setForm({ ...form(), [field]: next });
    };

    const toggleAllRoles = (field: 'visibility_roles' | 'management_roles') => {
        const allRoleIds = roles()?.map((r: any) => r.id) || [];
        const current = form()[field];
        if (current.length === allRoleIds.length) {
            setForm({ ...form(), [field]: [] });
        } else {
            setForm({ ...form(), [field]: allRoleIds });
        }
    };

    const addPage = () => {
        const newPages = [...form().pages, {
            title: `Page ${form().pages.length + 1}`,
            description: '',
            questions: [createNewQuestion(0)]
        }];
        setForm({ ...form(), pages: newPages });
    };

    const removePage = (pIdx: number) => {
        if (form().pages.length <= 1) return;
        const newPages = form().pages.filter((_, i) => i !== pIdx);
        setForm({ ...form(), pages: newPages });
    };

    const updatePage = (pIdx: number, field: keyof FormPage, value: any) => {
        const newPages = [...form().pages];
        newPages[pIdx] = { ...newPages[pIdx], [field]: value };
        setForm({ ...form(), pages: newPages });
    };

    const addQuestion = (pIdx: number) => {
        const newPages = [...form().pages];
        newPages[pIdx].questions.push(createNewQuestion(newPages[pIdx].questions.length));
        setForm({ ...form(), pages: newPages });
    };

    const updateQuestion = (pIdx: number, qIdx: number, field: keyof Question, value: any) => {
        const newPages = [...form().pages];
        newPages[pIdx].questions[qIdx] = { ...newPages[pIdx].questions[qIdx], [field]: value };
        
        if (field === 'type' && ['select', 'multiselect', 'rank'].includes(value)) {
            if (newPages[pIdx].questions[qIdx].options.length === 0) {
                newPages[pIdx].questions[qIdx].options = [''];
            }
        }

        setForm({ ...form(), pages: newPages });
    };

    const removeQuestion = (pIdx: number, qIdx: number) => {
        const newPages = [...form().pages];
        if (newPages[pIdx].questions.length <= 1 && newPages.length <= 1) {
            notify('Action Blocked', 'A form must have at least one question.', 'warning');
            return;
        }
        newPages[pIdx].questions = newPages[pIdx].questions.filter((_, i) => i !== qIdx);
        
        // If page becomes empty, we could either remove it or keep it.
        // Let's keep it for now unless user deletes the page.
        
        setForm({ ...form(), pages: newPages });
    };

    const moveQuestion = (pIdx: number, qIdx: number, direction: -1 | 1) => {
        const newPages = [...form().pages];
        const questions = newPages[pIdx].questions;
        if (qIdx + direction < 0 || qIdx + direction >= questions.length) return;
        
        const temp = questions[qIdx];
        questions[qIdx] = questions[qIdx + direction];
        questions[qIdx + direction] = temp;
        
        setForm({ ...form(), pages: newPages });
    };

    const allPreviousQuestions = (currentPIdx: number, currentQIdx: number) => {
        const list: Question[] = [];
        form().pages.forEach((page, pIdx) => {
            if (pIdx < currentPIdx) {
                list.push(...page.questions);
            } else if (pIdx === currentPIdx) {
                list.push(...page.questions.slice(0, currentQIdx));
            }
        });
        return list;
    };

    const updateOption = (pIdx: number, qIdx: number, optIdx: number, value: string) => {
        const newPages = [...form().pages];
        const newOptions = [...newPages[pIdx].questions[qIdx].options];
        newOptions[optIdx] = value;

        if (optIdx === newOptions.length - 1 && value.trim() !== '') {
            newOptions.push('');
        }

        newPages[pIdx].questions[qIdx] = { ...newPages[pIdx].questions[qIdx], options: newOptions };
        setForm({ ...form(), pages: newPages });
    };

    const removeOption = (pIdx: number, qIdx: number, optIdx: number) => {
        const newPages = [...form().pages];
        const newOptions = newPages[pIdx].questions[qIdx].options.filter((_, i) => i !== optIdx);
        if (newOptions.length === 0) newOptions.push('');
        
        newPages[pIdx].questions[qIdx] = { ...newPages[pIdx].questions[qIdx], options: newOptions };
        setForm({ ...form(), pages: newPages });
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        try {
            const payload = { ...form() };
            const res = await apiRequest(isNew() ? 'POST' : 'PUT', isNew() ? '/api/admin/forms' : `/api/admin/forms/${params.id}`, payload);
            setIsDirty(false);
            notify('Success', 'Form saved', 'success');
            if (isNew()) navigate(`/admin/forms/${res.id}`);
        } catch (e: any) {
            notify('Error', e.message, 'error');
        }
    };

    const getOptionIcon = (type: string) => {
        if (type === 'multiselect') return FaSolidSquare;
        if (type === 'rank') return () => <span style="font-weight: 800; opacity: 0.5;">#</span>;
        return FaSolidCircle;
    };

    const handleDelete = async () => {
        const ok = await showConfirmModal('Delete Form', 'Are you sure you want to delete this form? <strong>All submissions will be lost.</strong>');
        if (!ok) return;
        try {
            await apiRequest('DELETE', `/api/admin/forms/${params.id}`);
            notify('Success', 'Form deleted', 'success');
            navigate('/admin/forms');
        } catch (e: any) {
            notify('Error', e.message, 'error');
        }
    };

    return (
        <div class="dashboard-container">
            <main class="dashboard-content full-width">
                <Show when={!loading.loading} fallback={<p aria-busy="true">Loading form...</p>}>
                    <TabNav class="admin-nav-group">
                        <button class="tab-btn" classList={{ active: activeTab() === 'editor' }} onClick={() => setActiveTab('editor')}>
                            <FaSolidGear /> Editor
                        </button>
                        <Show when={!isNew()}>
                            <button class="tab-btn" classList={{ active: activeTab() === 'submissions' }} onClick={() => setActiveTab('submissions')}>
                                <FaSolidListUl /> Submissions
                            </button>
                        </Show>
                    </TabNav>

                    <Show when={activeTab() === 'editor'}>
                        <form id="form-editor-actual" onSubmit={handleSubmit} class="modern-form">
                            <div class="form-editor-header flex justify-between align-center mb-6">
                                <h2>{isNew() ? 'New Form' : 'Edit Form'}</h2>
                                <Show when={!isNew()}>
                                    <button type="button" class="small-btn delete outline" onClick={handleDelete} title="Delete Form">
                                        <FaSolidTrash /> Delete Form
                                    </button>
                                </Show>
                            </div>

                            <Panel title="Form Settings" icon={FaSolidGear}>
                                <div class="modern-form-group">
                                    <label class="form-label-top">Form Title
                                        <input type="text" class="title-input" value={form().title} onInput={e => setForm({...form(), title: e.currentTarget.value})} required placeholder="e.g. Attendance Waiver" />
                                    </label>
                                </div>
                                <label>Description
                                    <textarea rows="2" value={form().description} onInput={e => setForm({...form(), description: e.currentTarget.value})} placeholder="What is this form for?"></textarea>
                                </label>
                                <div class="grid-2-col">
                                    <Show when={!isNew() || !location.query.event_id}>
                                        <label>Form Context / Attachment
                                            <select 
                                                value={form().is_global ? 'global' : (form().event_id || '')} 
                                                onChange={e => {
                                                    const val = e.currentTarget.value;
                                                    if (val === 'global') {
                                                        setForm({...form(), is_global: true, event_id: null});
                                                    } else {
                                                        setForm({...form(), is_global: false, event_id: parseInt(val) || null});
                                                    }
                                                }}
                                            >
                                                <option value="global">Global (Standalone)</option>
                                                <optgroup label="Attach to Event">
                                                    <For each={events()}>
                                                        {evt => <option value={evt.id}>{evt.title} ({new Date(evt.start).toLocaleDateString()})</option>}
                                                    </For>
                                                </optgroup>
                                            </select>
                                        </label>
                                    </Show>
                                    <label>Closing Date (Optional)
                                        <input type="datetime-local" value={form().expires_at || ''} onInput={e => setForm({...form(), expires_at: e.currentTarget.value || null})} />
                                    </label>
                                    <div class="flex align-center pt-4">
                                        <div class="liquid-container secondary-bg toggle-panel" style={{ "padding": "1rem 1.25rem", "border-radius": "16px", "width": "100%" }}>
                                            <div class="flex justify-between align-center">
                                                <div>
                                                    <strong class="block">Allow Multiple Responses</strong>
                                                    <span class="small-text">Can users submit more than one response?</span>
                                                </div>
                                                <input type="checkbox" role="switch" checked={form().allow_multiple_responses} onChange={e => setForm({...form(), allow_multiple_responses: e.currentTarget.checked})} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Panel>

                            <Panel title="Access Control" icon={FaSolidShieldHalved}>
                                <div style={{ "display": "flex", "justify-content": "center", "margin-bottom": "2rem" }}>
                                    <TabNav>
                                        <button type="button" class="tab-btn" classList={{ active: accessTab() === 'visibility' }} onClick={() => setAccessTab('visibility')}>User Visibility</button>
                                        <button type="button" class="tab-btn" classList={{ active: accessTab() === 'management' }} onClick={() => setAccessTab('management')}>Management</button>
                                    </TabNav>
                                </div>

                                <Show when={accessTab() === 'visibility'}>
                                    <p class="small-text mb-4">Restrict who can see and answer this form. User must satisfy <strong>all</strong> active categories (e.g. have a required tag AND a required role).</p>
                                    
                                    <div class="sub-tab-nav mb-4">
                                        <button type="button" classList={{ active: visibilityType() === 'tags' }} onClick={() => setVisibilityType('tags')}>Tags ({form().visibility_tags.length})</button>
                                        <button type="button" classList={{ active: visibilityType() === 'roles' }} onClick={() => setVisibilityType('roles')}>Roles ({form().visibility_roles.length})</button>
                                        <button type="button" classList={{ active: visibilityType() === 'permissions' }} onClick={() => setVisibilityType('permissions')}>Permissions ({form().visibility_permissions.length})</button>
                                    </div>

                                    <div class="access-selection-area liquid-container bg-alt" style={{ "padding": "1.5rem", "border-radius": "16px", "min-height": "200px" }}>
                                        <Show when={visibilityType() === 'tags'}>
                                            <div class="flex flex-wrap gap-2">
                                                <For each={tags()} fallback={<p class="text-muted">No tags found.</p>}>
                                                    {tag => (
                                                        <label class="tag-checkbox">
                                                            <input type="checkbox" checked={form().visibility_tags.includes(tag.id)} onChange={() => toggleArrayItem('visibility_tags', tag.id)} style="display:none;" />
                                                            <span class="tag-badge tag-badge-simple" classList={{ selected: form().visibility_tags.includes(tag.id) }} style={{ "--tag-colour": tag.color }}>{tag.name}</span>
                                                        </label>
                                                    )}
                                                </For>
                                            </div>
                                        </Show>
                                        <Show when={visibilityType() === 'roles'}>
                                            <div class="mb-4">
                                                <button type="button" class="small-btn secondary" onClick={() => toggleAllRoles('visibility_roles')}>
                                                    {form().visibility_roles.length === (roles()?.length || 0) ? 'Deselect All' : 'Select All'}
                                                </button>
                                            </div>
                                            <div class="flex flex-wrap gap-2">
                                                <For each={roles()} fallback={<p class="text-muted">No roles found.</p>}>
                                                    {role => (
                                                        <label class="tag-checkbox">
                                                            <input type="checkbox" checked={form().visibility_roles.includes(role.id)} onChange={() => toggleArrayItem('visibility_roles', role.id)} style="display:none;" />
                                                            <span class="tag-badge tag-badge-simple neutral" classList={{ selected: form().visibility_roles.includes(role.id) }}>{role.name}</span>
                                                        </label>
                                                    )}
                                                </For>
                                            </div>
                                        </Show>
                                        <Show when={visibilityType() === 'permissions'}>
                                            <div class="flex flex-wrap gap-2">
                                                <For each={permissions()} fallback={<p class="text-muted">No permissions found.</p>}>
                                                    {perm => (
                                                        <label class="tag-checkbox">
                                                            <input type="checkbox" checked={form().visibility_permissions.includes(perm.id)} onChange={() => toggleArrayItem('visibility_permissions', perm.id)} style="display:none;" />
                                                            <span class="tag-badge tag-badge-simple neutral" classList={{ selected: form().visibility_permissions.includes(perm.id) }}>{perm.slug}</span>
                                                        </label>
                                                    )}
                                                </For>
                                            </div>
                                        </Show>
                                    </div>
                                </Show>

                                <Show when={accessTab() === 'management'}>
                                    <p class="small-text mb-4">Users with these roles or permissions can view all submissions for this form, even without full 'form.manage' permission.</p>
                                    
                                    <div class="sub-tab-nav mb-4">
                                        <button type="button" classList={{ active: managementType() === 'roles' }} onClick={() => setManagementType('roles')}>Roles ({form().management_roles.length})</button>
                                        <button type="button" classList={{ active: managementType() === 'permissions' }} onClick={() => setManagementType('permissions')}>Permissions ({form().management_permissions.length})</button>
                                    </div>

                                    <div class="access-selection-area liquid-container bg-alt" style={{ "padding": "1.5rem", "border-radius": "16px" }}>
                                        <Show when={managementType() === 'roles'}>
                                            <div class="mb-4">
                                                <button type="button" class="small-btn secondary" onClick={() => toggleAllRoles('management_roles')}>
                                                    {form().management_roles.length === (roles()?.length || 0) ? 'Deselect All' : 'Select All'}
                                                </button>
                                            </div>
                                            <div class="flex flex-wrap gap-2">
                                                <For each={roles()} fallback={<p class="text-muted">No roles found.</p>}>
                                                    {role => (
                                                        <label class="tag-checkbox">
                                                            <input type="checkbox" checked={form().management_roles.includes(role.id)} onChange={() => toggleArrayItem('management_roles', role.id)} style="display:none;" />
                                                            <span class="tag-badge tag-badge-simple neutral" classList={{ selected: form().management_roles.includes(role.id) }}>{role.name}</span>
                                                        </label>
                                                    )}
                                                </For>
                                            </div>
                                        </Show>
                                        <Show when={managementType() === 'permissions'}>
                                            <div class="flex flex-wrap gap-2">
                                                <For each={permissions()} fallback={<p class="text-muted">No permissions found.</p>}>
                                                    {perm => (
                                                        <label class="tag-checkbox">
                                                            <input type="checkbox" checked={form().management_permissions.includes(perm.id)} onChange={() => toggleArrayItem('management_permissions', perm.id)} style="display:none;" />
                                                            <span class="tag-badge tag-badge-simple neutral" classList={{ selected: form().management_permissions.includes(perm.id) }}>{perm.slug}</span>
                                                        </label>
                                                    )}
                                                </For>
                                            </div>
                                        </Show>
                                    </div>
                                </Show>
                            </Panel>

                            <div class="form-structure-section">
                                <div class="section-header flex justify-between align-center mb-6">
                                    <h3>Form Structure & Pages</h3>
                                    <button type="button" class="small-btn secondary" onClick={addPage}><FaSolidPlus /> Add Page</button>
                                </div>

                                <For each={form().pages}>
                                    {(page, pIdx) => (
                                        <div class="form-page-group mb-8">
                                            <div class="page-header-panel liquid-container secondary-bg mb-4" style={{ "padding": "1rem 1.5rem", "border-radius": "16px" }}>
                                                <div class="flex justify-between align-center">
                                                    <div class="flex align-center gap-4 flex-grow">
                                                        <span class="page-number-badge">Page {pIdx() + 1}</span>
                                                        <input 
                                                            type="text" 
                                                            class="title-input-minimal" 
                                                            value={page.title} 
                                                            onInput={e => updatePage(pIdx(), 'title', e.currentTarget.value)}
                                                            placeholder="Page Title (Optional)"
                                                        />
                                                    </div>
                                                    <Show when={form().pages.length > 1}>
                                                        <button type="button" class="icon-btn delete small-btn" onClick={() => removePage(pIdx())}><FaSolidXmark /></button>
                                                    </Show>
                                                </div>
                                                <textarea 
                                                    rows="1" 
                                                    class="mt-2 description-input-minimal" 
                                                    value={page.description} 
                                                    onInput={e => updatePage(pIdx(), 'description', e.currentTarget.value)}
                                                    placeholder="Optional page description..."
                                                ></textarea>
                                            </div>

                                            <div class="page-questions pl-4 border-left">
                                                <For each={page.questions}>
                                                    {(q, qIdx) => (
                                                        <Panel 
                                                            class="question-panel" 
                                                            title={
                                                                <div class="question-title-row">
                                                                    <span>Question {qIdx() + 1}</span>
                                                                    <label class="checkbox-label required-toggle">
                                                                        <input type="checkbox" checked={q.is_required} onChange={e => updateQuestion(pIdx(), qIdx(), 'is_required', e.currentTarget.checked)} />
                                                                        Required
                                                                    </label>
                                                                </div>
                                                            }
                                                            action={
                                                                <div class="question-actions">
                                                                    <button type="button" class="small-btn icon-only secondary" title="Move Up" onClick={() => moveQuestion(pIdx(), qIdx(), -1)} disabled={qIdx() === 0}><FaSolidArrowUp /></button>
                                                                    <button type="button" class="small-btn icon-only secondary" title="Move Down" onClick={() => moveQuestion(pIdx(), qIdx(), 1)} disabled={qIdx() === page.questions.length - 1}><FaSolidArrowDown /></button>
                                                                    <button type="button" class="small-btn icon-only delete" title="Remove Question" onClick={() => removeQuestion(pIdx(), qIdx())} disabled={page.questions.length <= 1 && form().pages.length <= 1}><FaSolidTrash /></button>
                                                                </div>
                                                            }
                                                        >
                                                            <div class="grid-2-col">
                                                                <label>Question Title
                                                                    <input type="text" value={q.prompt} onInput={e => updateQuestion(pIdx(), qIdx(), 'prompt', e.currentTarget.value)} required placeholder="e.g. Dietary Requirements" />
                                                                </label>
                                                                <label>Response Type
                                                                    <select value={q.type} onChange={e => updateQuestion(pIdx(), qIdx(), 'type', e.currentTarget.value as any)}>
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

                                                            <div class="form-group mt-2">
                                                                <label class="small-text mb-1 block">Optional Description / Instructions</label>
                                                                <RichTextEditor 
                                                                    value={q.description} 
                                                                    onInput={(v: string) => updateQuestion(pIdx(), qIdx(), 'description', v)} 
                                                                    placeholder="Add more details or context for this question..."
                                                                />
                                                            </div>

                                                            <Show when={q.type === 'multiselect'}>
                                                                <div class="selection-config">
                                                                    <label>Max Selections (0 = unlimited)
                                                                        <input type="number" min="0" value={q.max_selections} onInput={e => updateQuestion(pIdx(), qIdx(), 'max_selections', parseInt(e.currentTarget.value) || 0)} />
                                                                    </label>
                                                                </div>
                                                            </Show>

                                                            <Show when={['select', 'multiselect', 'rank'].includes(q.type)}>
                                                                <div class="options-builder">
                                                                    <label class="options-label">Choices</label>
                                                                    <div class="options-list">
                                                                        <Index each={q.options}>
                                                                            {(opt, optIdx) => (
                                                                                <div class="option-row">
                                                                                    <div class="option-type-icon">
                                                                                        <Dynamic component={getOptionIcon(q.type)} style={{ opacity: 0.5, "font-size": q.type === 'multiselect' ? '1rem' : '0.6rem' }} />
                                                                                    </div>
                                                                                    <input 
                                                                                        type="text" 
                                                                                        class="compact-input"
                                                                                        value={opt()} 
                                                                                        onInput={e => updateOption(pIdx(), qIdx(), optIdx, e.currentTarget.value)} 
                                                                                        placeholder={`Option ${optIdx + 1}...`}
                                                                                    />
                                                                                    <Show when={q.options.length > 1}>
                                                                                        <button type="button" class="icon-btn delete" onClick={() => removeOption(pIdx(), qIdx(), optIdx)}><FaSolidXmark /></button>
                                                                                    </Show>
                                                                                </div>
                                                                            )}
                                                                        </Index>
                                                                    </div>
                                                                </div>
                                                            </Show>
                                                            
                                                            <Show when={pIdx() > 0 || qIdx() > 0}>
                                                                <div class="logic-gate-panel liquid-container secondary-bg">
                                                                    <p class="logic-description"><strong>Conditional Logic:</strong> Display this question only if...</p>
                                                                    <div class="grid-3-col">
                                                                        <div class="flex-column">
                                                                            <label class="mb-1">Previous Question</label>
                                                                            <select 
                                                                                value={q.dependency_question_id || ''} 
                                                                                onChange={e => {
                                                                                    const val = e.currentTarget.value;
                                                                                    updateQuestion(pIdx(), qIdx(), 'dependency_question_id', val === '' ? null : val);
                                                                                }}
                                                                                class="compact-input"
                                                                            >
                                                                                <option value="">(Always Visible)</option>
                                                                                <For each={allPreviousQuestions(pIdx(), qIdx())}>
                                                                                    {(prevQ) => (
                                                                                        <option value={prevQ.clientId}>
                                                                                            {prevQ.prompt.substring(0, 40) || '(No Title)'}
                                                                                        </option>
                                                                                    )}
                                                                                </For>
                                                                            </select>
                                                                        </div>
                                                                        
                                                                        <Show when={q.dependency_question_id !== null}>
                                                                            <div class="flex-column">
                                                                                <label class="mb-1">Operator</label>
                                                                                <select value={q.dependency_operator} onChange={e => updateQuestion(pIdx(), qIdx(), 'dependency_operator', e.currentTarget.value)} class="compact-input">
                                                                                    <option value="equals">is exactly</option>
                                                                                    <option value="not_equals">is not</option>
                                                                                    <option value="contains">contains</option>
                                                                                    <option value="is_one_of">is one of (Bash Selector)</option>
                                                                                    <option value="regex">matches regex</option>
                                                                                    <option value="was_visible">was visible</option>
                                                                                    {(() => {
                                                                                        const targetQ = allPreviousQuestions(pIdx(), qIdx()).find(qq => qq.clientId === q.dependency_question_id);
                                                                                        if (targetQ?.type === 'number') {
                                                                                            return (
                                                                                                <>
                                                                                                    <option value="greater_than">is greater than</option>
                                                                                                    <option value="less_than">is less than</option>
                                                                                                </>
                                                                                            );
                                                                                        }
                                                                                        return null;
                                                                                    })()}
                                                                                </select>
                                                                            </div>
                                                                            <div class="flex-column">
                                                                                <label class="mb-1">Value</label>
                                                                                <Switch>
                                                                                    <Match when={q.dependency_operator === 'was_visible'}>
                                                                                        <input type="text" disabled value="N/A" class="compact-input" />
                                                                                    </Match>
                                                                                    <Match when={(() => {
                                                                                        const targetQ = allPreviousQuestions(pIdx(), qIdx()).find(qq => qq.clientId === q.dependency_question_id);
                                                                                        return targetQ && ['select', 'multiselect', 'rank'].includes(targetQ.type);
                                                                                    })()}>
                                                                                        <div class="conditional-options-container">
                                                                                            {(() => {
                                                                                                const targetQ = allPreviousQuestions(pIdx(), qIdx()).find(qq => qq.clientId === q.dependency_question_id)!;
                                                                                                const isMulti = q.dependency_operator === 'is_one_of';
                                                                                                
                                                                                                if (isMulti) {
                                                                                                    const currentValues = (q.dependency_value || '').split(',').filter(Boolean);
                                                                                                    return (
                                                                                                        <div class="flex flex-wrap gap-1">
                                                                                                            <For each={targetQ.options.filter(o => o.trim())}>
                                                                                                                {opt => (
                                                                                                                    <button 
                                                                                                                        type="button" 
                                                                                                                        class="tag-badge tag-badge-simple neutral pointer" 
                                                                                                                        classList={{ selected: currentValues.includes(opt) }}
                                                                                                                        onClick={() => {
                                                                                                                            const next = currentValues.includes(opt) 
                                                                                                                                ? currentValues.filter(v => v !== opt) 
                                                                                                                                : [...currentValues, opt];
                                                                                                                            updateQuestion(pIdx(), qIdx(), 'dependency_value', next.join(','));
                                                                                                                        }}
                                                                                                                    >
                                                                                                                        {opt}
                                                                                                                    </button>
                                                                                                                )}
                                                                                                            </For>
                                                                                                        </div>
                                                                                                    );
                                                                                                }

                                                                                                return (
                                                                                                    <select 
                                                                                                        value={q.dependency_value || ''} 
                                                                                                        onChange={e => updateQuestion(pIdx(), qIdx(), 'dependency_value', e.currentTarget.value)}
                                                                                                        class="compact-input"
                                                                                                    >
                                                                                                        <option value="">Select option...</option>
                                                                                                        <For each={targetQ.options.filter(o => o.trim())}>
                                                                                                            {opt => <option value={opt}>{opt}</option>}
                                                                                                        </For>
                                                                                                    </select>
                                                                                                );
                                                                                            })()}
                                                                                        </div>
                                                                                    </Match>
                                                                                    <Match when={true}>
                                                                                        <input 
                                                                                            type={(() => {
                                                                                                const targetQ = allPreviousQuestions(pIdx(), qIdx()).find(qq => qq.clientId === q.dependency_question_id);
                                                                                                return targetQ?.type === 'number' && !['contains', 'regex', 'is_one_of'].includes(q.dependency_operator) ? 'number' : 'text';
                                                                                            })()} 
                                                                                            value={q.dependency_value || ''} 
                                                                                            onInput={e => updateQuestion(pIdx(), qIdx(), 'dependency_value', e.currentTarget.value)} 
                                                                                            placeholder={
                                                                                                q.dependency_operator === 'regex' ? "Regex pattern" : 
                                                                                                q.dependency_operator === 'is_one_of' ? "Val1, Val2, Val3" : "Target value"
                                                                                            }
                                                                                            class="compact-input"
                                                                                        />
                                                                                    </Match>
                                                                                </Switch>
                                                                            </div>
                                                                        </Show>
                                                                    </div>
                                                                </div>
                                                            </Show>
                                                        </Panel>
                                                    )}
                                                </For>
                                                <button type="button" class="small-btn secondary mt-4" onClick={() => addQuestion(pIdx())}>
                                                    <FaSolidPlus /> Add Question to Page {pIdx() + 1}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </For>
                            </div>
                        </form>
                    </Show>

                    <Show when={activeTab() === 'submissions'}>
                        <SubmissionsTab formId={formId() || ''} />
                    </Show>
                </Show>
            </main>

            <Show when={activeTab() === 'editor' && !loading.loading && (isDirty() || isNew())}>
                <div class="floating-action-container">
                    <button 
                        type="submit" 
                        form="form-editor-actual"
                        class="floating-save-btn prominent-btn"
                        title={isNew() ? 'Create Form' : 'Save Changes'}
                    >
                        <FaSolidFloppyDisk />
                        <span class="btn-label">{isNew() ? 'Create' : 'Save'}</span>
                    </button>
                </div>
            </Show>
        </div>
    );
}

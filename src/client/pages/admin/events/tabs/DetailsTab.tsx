// todo clean up
import { createSignal, createResource, For, Show, onMount } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { useNavigate } from "@solidjs/router";
import UploadWidget from "@/components/UploadWidget";
import Panel from "@/components/Panel";
import { INFO_SVG, IMAGE_SVG, LOCAL_ACTIVITY_SVG, CALENDAR_TODAY_SVG, SETTINGS_SVG } from '@/utils/icons';
import RichTextEditor from "@/components/RichTextEditor";

interface Tag {
    id: number;
    name: string;
    color: string;
}

interface EventData {
    id?: number;
    title: string;
    start: string;
    end: string;
    location: string;
    description: string;
    difficulty_level: number;
    upfront_cost: number;
    signup_required: boolean;
    max_attendees: number;
    upfront_refund_cutoff: string | null;
    is_offsite: boolean;
    allow_kit_requests: boolean;
    image_id: number | null;
    image_url?: string;
    tags?: Tag[];
    status?: string;
    visible_at?: string | null;
}

export default function DetailsTab(props: { event: EventData, allTags: Tag[], globalDefaultUrl: string }) {
    const { notify } = useNotifications();
    const navigate = useNavigate();
    const isNew = () => !props.event.id;

    const [formState, setFormState] = createSignal<EventData>({ 
        allow_kit_requests: true,
        ...props.event 
    });
    const [selectedTags, setSelectedTagIds] = createSignal<number[]>(props.event.tags?.map(t => t.id) || []);

    const updateField = (key: keyof EventData, value: any) => {
        const oldState = formState();
        
        if (key === 'start' && oldState.start && oldState.end) {
            const oldStart = new Date(oldState.start).getTime();
            const oldEnd = new Date(oldState.end).getTime();
            const duration = oldEnd - oldStart;
            
            const newStart = new Date(value).getTime();
            const newEnd = new Date(newStart + duration);
            
            // Format to YYYY-MM-DDTHH:mm
            const pad = (n: number) => n.toString().padStart(2, '0');
            const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            
            setFormState({ 
                ...oldState, 
                start: value,
                end: format(newEnd)
            });
            return;
        }

        setFormState({ ...oldState, [key]: value });
    };

    const toggleTag = (tagId: number) => {
        const current = selectedTags();
        const next = current.includes(tagId) ? current.filter(id => id !== tagId) : [...current, tagId];
        setSelectedTagIds(next);
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        const data = {
            ...formState(),
            tags: selectedTags(),
            upfront_refund_cutoff: formState().upfront_refund_cutoff || null,
            visible_at: formState().visible_at || null
        };

        try {
            if (isNew()) {
                const res = await apiRequest('POST', '/api/admin/event', data);
                notify('Success', 'Event created', 'success');
                navigate(`/admin/event/${res.data.id}`);
            } else {
                await apiRequest('PUT', `/api/admin/event/${props.event.id}`, data);
                notify('Success', 'Event updated', 'success');
            }
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    return (
        <form id="event-form" class="modern-form" onSubmit={handleSubmit}>
            <div class="details-grid-layout">
                <div class="details-main-col">
                    <Panel title="Event Overview" icon={INFO_SVG}>
                        <div class="modern-form-group">
                            <label class="form-label-top">Event Title
                                <input type="text" value={formState().title} onInput={e => updateField('title', e.currentTarget.value)} required class="title-input" placeholder="e.g. Weekly Training" />
                            </label>
                        </div>
                        <div class="grid-2-col">
                            <label>Location
                                <input type="text" value={formState().location} onInput={e => updateField('location', e.currentTarget.value)} placeholder="Where is it happening?" />
                            </label>
                            <label>Difficulty (1-5)
                                <input type="number" min="1" max="5" value={formState().difficulty_level} onInput={e => updateField('difficulty_level', parseInt(e.currentTarget.value))} required />
                            </label>
                        </div>
                        <div class="form-group mt-4">
                            <label class="mb-2 block">Description</label>
                            <RichTextEditor 
                                value={formState().description} 
                                onInput={v => updateField('description', v)} 
                                placeholder="What's the plan?"
                            />
                        </div>
                    </Panel>

                    <Panel title="Schedule & Status" icon={CALENDAR_TODAY_SVG}>
                        <div class="grid-2-col">
                            <label>Start Time <input type="datetime-local" value={formState().start?.slice(0, 16)} onInput={e => updateField('start', e.currentTarget.value)} required /></label>
                            <label>End Time <input type="datetime-local" value={formState().end?.slice(0, 16)} onInput={e => updateField('end', e.currentTarget.value)} required /></label>
                        </div>

                        <div class="grid-2-col mt-4">
                            <label>Visibility Status
                                <select value={formState().status || 'confirmed'} onChange={e => updateField('status', e.currentTarget.value)}>
                                    <option value="confirmed">Confirmed (Visible)</option>
                                    <option value="pending">Draft (Admin Only)</option>
                                    <option value="scheduled">Scheduled (Auto-Release)</option>
                                </select>
                            </label>
                            <Show when={formState().status === 'scheduled'}>
                                <label>Release Date & Time
                                    <input type="datetime-local" value={formState().visible_at?.slice(0, 16) || ''} onInput={e => updateField('visible_at', e.currentTarget.value)} required />
                                </label>
                            </Show>
                        </div>
                    </Panel>

                    <Panel title="Settings & Policies" icon={SETTINGS_SVG}>
                        <div class="grid-2-col">
                            <label>Upfront Cost (£)
                                <input type="number" step="0.01" value={formState().upfront_cost} onInput={e => updateField('upfront_cost', parseFloat(e.currentTarget.value) || 0)} />
                            </label>
                            <div class="signup-policy pt-4">
                                <label class="checkbox-label">
                                    <input type="checkbox" checked={formState().is_offsite} onChange={e => updateField('is_offsite', e.currentTarget.checked)} />
                                    Requires Transport
                                </label>
                            </div>
                            <div class="signup-policy pt-4">
                                <label class="checkbox-label">
                                    <input type="checkbox" checked={formState().allow_kit_requests} onChange={e => updateField('allow_kit_requests', e.currentTarget.checked)} />
                                    Allow Kit Requests
                                </label>
                            </div>
                        </div>

                        <div class="form-divider my-4"></div>

                        <div class="settings-group-compact">
                            <div class="signup-policy">
                                <label class="checkbox-label">
                                    <input type="checkbox" checked={formState().signup_required} onChange={e => updateField('signup_required', e.currentTarget.checked)} />
                                    Limit Attendees
                                </label>
                                <Show when={formState().signup_required}>
                                    <div class="conditional-input mt-2">
                                        <label>Maximum Spaces
                                            <input type="number" value={formState().max_attendees} onInput={e => updateField('max_attendees', parseInt(e.currentTarget.value) || 0)} placeholder="0 = Unlimited" />
                                        </label>
                                    </div>
                                </Show>
                            </div>

                            <div class="refund-policy mt-4">
                                <label class="checkbox-label">
                                    <input type="checkbox" checked={!!formState().upfront_refund_cutoff} onChange={e => updateField('upfront_refund_cutoff', e.currentTarget.checked ? new Date().toISOString() : null)} />
                                    Enable Refund Deadline
                                </label>
                                <Show when={!!formState().upfront_refund_cutoff}>
                                    <div class="conditional-input mt-2">
                                        <label>Refund Cutoff Time
                                            <input type="datetime-local" value={formState().upfront_refund_cutoff?.slice(0, 16) || ''} onInput={e => updateField('upfront_refund_cutoff', e.currentTarget.value)} />
                                        </label>
                                    </div>
                                </Show>
                            </div>
                        </div>
                    </Panel>
                </div>

                <div class="details-side-col">
                    <Panel title="Event Image" icon={IMAGE_SVG}>
                        <UploadWidget
                            selectMode="single"
                            autoUpload={true}
                            enableLibrary={true}
                            defaultPreview={props.event.image_url || props.globalDefaultUrl}
                            onImageSelect={({ id }) => updateField('image_id', id)}
                            onRemove={async () => {
                                if (isNew()) {
                                    updateField('image_id', null);
                                    return true;
                                }
                                if (!confirm('Remove manual image and reset to default?')) return false;
                                try {
                                    await apiRequest('POST', `/api/admin/event/${props.event.id}/reset-image`);
                                    updateField('image_id', null);
                                    return true;
                                } catch (err: any) {
                                    notify('Error', err.message, 'error');
                                    return false;
                                }
                            }}
                        />
                    </Panel>

                    <Panel title="Categories & Tags" icon={LOCAL_ACTIVITY_SVG}>
                        <div class="tags-selection-grid">
                            <For each={props.allTags}>
                                {tag => (
                                    <label class="tag-checkbox">
                                        <input type="checkbox" checked={selectedTags().includes(tag.id)} onChange={() => toggleTag(tag.id)} style="display:none;" />
                                        <span class="tag-badge tag-badge-simple" classList={{ selected: selectedTags().includes(tag.id) }} style={{ "--tag-colour": tag.color }}>{tag.name}</span>
                                    </label>
                                )}
                            </For>
                        </div>
                    </Panel>

                    <div class="form-actions-sticky mt-4">
                        <button type="submit" class="wide-btn primary">{isNew() ? 'Create Event' : 'Save Changes'}</button>
                    </div>
                </div>
            </div>
        </form>
    );
}

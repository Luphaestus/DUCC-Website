import { createSignal, createResource, For, Show, onMount } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { useNavigate } from "@solidjs/router";
import UploadWidget from "@/components/UploadWidget";
import { INFO_SVG, IMAGE_SVG } from '@/utils/icons';

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

    const [formState, setFormState] = createSignal<EventData>({ ...props.event });
    const [selectedTags, setSelectedTagIds] = createSignal<number[]>(props.event.tags?.map(t => t.id) || []);

    const updateField = (key: keyof EventData, value: any) => {
        setFormState({ ...formState(), [key]: value });
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
        <form id="event-form" onSubmit={handleSubmit}>
            <div class="modern-form-group">
                <label class="form-label-top">Event Title
                    <input type="text" value={formState().title} onInput={e => updateField('title', e.currentTarget.value)} required class="full-width-input title-input" placeholder="e.g. Weekly Training" />
                </label>
            </div>

            <div class="event-content-split">
                <div class="event-details-section">
                    <h3 class="section-header-modern">
                        <span innerHTML={INFO_SVG} /> Basic Details
                    </h3>
                    
                    <div class="grid-2-col">
                        <label>Start Time <input type="datetime-local" value={formState().start?.slice(0, 16)} onInput={e => updateField('start', e.currentTarget.value)} required /></label>
                        <label>End Time <input type="datetime-local" value={formState().end?.slice(0, 16)} onInput={e => updateField('end', e.currentTarget.value)} required /></label>
                    </div>

                    <div class="grid-2-col">
                        <label>Status
                            <select value={formState().status || 'confirmed'} onChange={e => updateField('status', e.currentTarget.value)}>
                                <option value="confirmed">Confirmed (Visible)</option>
                                <option value="pending">Draft (Admin Only)</option>
                                <option value="scheduled">Scheduled (Auto-Release)</option>
                            </select>
                        </label>
                        <Show when={formState().status === 'scheduled'}>
                            <label>Visible At
                                <input type="datetime-local" value={formState().visible_at?.slice(0, 16) || ''} onInput={e => updateField('visible_at', e.currentTarget.value)} required />
                            </label>
                        </Show>
                    </div>
                    
                    <label>Location <input type="text" value={formState().location} onInput={e => updateField('location', e.currentTarget.value)} placeholder="Where is it happening?" /></label>
                    
                    <label>Description <textarea rows="5" value={formState().description} onInput={e => updateField('description', e.currentTarget.value)} placeholder="What's the plan?"></textarea></label>
                    
                    <div class="grid-2-col">
                        <label>Difficulty (1-5) <input type="number" min="1" max="5" value={formState().difficulty_level} onInput={e => updateField('difficulty_level', parseInt(e.currentTarget.value))} required /></label>
                        <label>Cost (£) <input type="number" step="0.01" value={formState().upfront_cost} onInput={e => updateField('upfront_cost', parseFloat(e.currentTarget.value) || 0)} /></label>
                    </div>

                    <div class="form-divider"></div>

                    <div class="settings-group">
                        <div class="signup-policy">
                            <label class="checkbox-label">
                                <input type="checkbox" checked={formState().signup_required} onChange={e => updateField('signup_required', e.currentTarget.checked)} /> 
                                Signup Required
                            </label>
                            <Show when={formState().signup_required}>
                                <div class="conditional-input">
                                    <label>Max Attendees
                                        <input type="number" value={formState().max_attendees} onInput={e => updateField('max_attendees', parseInt(e.currentTarget.value) || 0)} placeholder="0 = Unlimited" />
                                    </label>
                                </div>
                            </Show>
                        </div>

                        <div class="refund-policy">
                            <label class="checkbox-label">
                                <input type="checkbox" checked={!!formState().upfront_refund_cutoff} onChange={e => updateField('upfront_refund_cutoff', e.currentTarget.checked ? new Date().toISOString() : null)} /> 
                                Allow Refunds
                            </label>
                            <Show when={!!formState().upfront_refund_cutoff}>
                                <div class="conditional-input">
                                    <label>Refund Cutoff Date
                                        <input type="datetime-local" value={formState().upfront_refund_cutoff?.slice(0, 16) || ''} onInput={e => updateField('upfront_refund_cutoff', e.currentTarget.value)} />
                                    </label>
                                </div>
                            </Show>
                        </div>

                        <div class="trip-policy">
                            <label class="checkbox-label">
                                <input type="checkbox" checked={formState().is_offsite} onChange={e => updateField('is_offsite', e.currentTarget.checked)} /> 
                                External Trip (Requires Transport)
                            </label>
                        </div>
                    </div>

                    <h3>Tags</h3>
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
                </div>

                <div class="event-image-section">
                    <h3 class="section-header-modern">
                        <span innerHTML={IMAGE_SVG} /> Event Image
                    </h3>
                    <UploadWidget 
                        selectMode="single"
                        autoUpload={true}
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
                </div>
            </div>
            
            <div class="form-actions mt-6">
                <button type="submit" class="wide-btn primary">{isNew() ? 'Create Event' : 'Save Changes'}</button>
            </div>
        </form>
    );
}

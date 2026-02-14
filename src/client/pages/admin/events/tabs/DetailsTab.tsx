// todo clean up
import { createSignal, createResource, For, Show, onMount, createEffect } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { useNavigate, useBeforeLeave } from "@solidjs/router";
import UploadWidget from "@/components/UploadWidget";
import Panel from "@/components/Panel";
import { INFO_SVG, IMAGE_SVG, LOCAL_ACTIVITY_SVG, CALENDAR_TODAY_SVG, SETTINGS_SVG, SAVE_SVG } from '@/utils/icons';
import RichTextEditor from "@/components/RichTextEditor";
import { smartDateAdjust } from "@/utils/utils";
import { showConfirmModal } from "@/utils/modal";

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

export default function DetailsTab(props: { 
  event: EventData, 
  allTags: Tag[], 
  globalDefaultUrl: string,
  onUpdate?: (event: any) => void
}) {
  const { notify } = useNotifications();
  const navigate = useNavigate();
  const isNew = () => !props.event.id;

  const [formState, setFormState] = createSignal<EventData>({
    ...props.event,
    allow_kit_requests: props.event.allow_kit_requests ?? true
  });
  const [selectedTags, setSelectedTagIds] = createSignal<number[]>(props.event.tags?.map(t => t.id) || []);
  const [isDirty, setIsDirty] = createSignal(false);

  createEffect(() => {
    setFormState({
      ...props.event,
      allow_kit_requests: props.event.allow_kit_requests ?? true
    });
    setSelectedTagIds(props.event.tags?.map(t => t.id) || []);
    setIsDirty(false);
  });

  // Notify parent of live updates
  createEffect(() => {
    const state = formState();
    const currentTags = selectedTags();
    props.onUpdate?.({
      ...state,
      tags: props.allTags.filter(t => currentTags.includes(t.id))
    });
  });

  // Automatically update default image based on tags
  createEffect(async () => {
    const tagIds = selectedTags();
    if (!formState().image_id) {
      try {
        const res = await apiRequest('POST', '/api/admin/events/calculate-fallback-image', { tagIds });
        setFormState(prev => ({ ...prev, image_url: res.url }));
      } catch (e) {
        setFormState(prev => ({ ...prev, image_url: props.globalDefaultUrl }));
      }
    }
  });

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

  const updateField = (key: keyof EventData, value: any) => {
    setIsDirty(true);
    const oldState = formState();

    if (key === 'start' && oldState.start && oldState.end) {
      const oldStart = new Date(oldState.start).getTime();
      const oldEnd = new Date(oldState.end).getTime();
      const duration = oldEnd - oldStart;

      const newStart = new Date(value).getTime();
      const newEnd = new Date(newStart + duration);

      // Format to YYYY-MM-DDTHH:mm
      const pad = (n: number) => n.toString().padStart(2, '0');
      const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

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
    setIsDirty(true);
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
        setIsDirty(false);
        notify('Success', 'Event created', 'success');
        navigate(`/admin/event/${res.data.id}`);
      } else {
        await apiRequest('PUT', `/api/admin/event/${props.event.id}`, data);
        setIsDirty(false);
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
            <div class="form-group">
              <label class="block">Description</label>
              <RichTextEditor
                value={formState().description}
                onInput={v => updateField('description', v)}
                placeholder="What's the plan?"
              />
            </div>
          </Panel>

          <Panel title="Schedule & Status" icon={CALENDAR_TODAY_SVG}>
            <div class="grid-2-col">
              <label>Start Time <input type="datetime-local" value={formState().start?.slice(0, 16)} onChange={e => {
                const { date, valid } = smartDateAdjust(e.currentTarget.value);
                if (valid) updateField('start', date.toISOString());
              }} onFocus={e => {
                if (!e.currentTarget.value) {
                  const d = new Date();
                  d.setMinutes(0, 0, 0);
                  updateField('start', d.toISOString());
                }
              }} required /></label>
              <label>End Time <input type="datetime-local" value={formState().end?.slice(0, 16)} onChange={e => {
                const { date, valid } = smartDateAdjust(e.currentTarget.value);
                if (valid) updateField('end', date.toISOString());
              }} onFocus={e => {
                if (!e.currentTarget.value) {
                  const d = new Date(formState().start || new Date());
                  d.setHours(d.getHours() + 1);
                  updateField('end', d.toISOString());
                }
              }} required /></label>
            </div>

            <div class="grid-2-col">
              <label>Visibility Status
                <select value={formState().status || 'confirmed'} onChange={e => updateField('status', e.currentTarget.value)}>
                  <option value="confirmed">Confirmed (Visible)</option>
                  <option value="pending">Draft (Admin Only)</option>
                  <option value="scheduled">Scheduled (Auto-Release)</option>
                </select>
              </label>
              <Show when={formState().status === 'scheduled'}>
                <label>Release Date & Time
                  <input type="datetime-local" value={formState().visible_at?.slice(0, 16) || ''} onChange={e => {
                    const { date, valid } = smartDateAdjust(e.currentTarget.value);
                    if (valid) updateField('visible_at', date.toISOString());
                  }} onFocus={e => {
                    if (!e.currentTarget.value) {
                      const d = new Date();
                      d.setMinutes(0, 0, 0);
                      updateField('visible_at', d.toISOString());
                    }
                  }} required />
                </label>
              </Show>
            </div>
          </Panel>

          <Panel title="Settings & Policies" icon={SETTINGS_SVG}>
            <div class="settings-revamp-grid">
              <div class="settings-column">
                <label>Upfront Cost (£)
                  <input type="number" step="0.01" value={formState().upfront_cost} onInput={e => updateField('upfront_cost', parseFloat(e.currentTarget.value) || 0)} />
                </label>

                <div class="revamp-checkbox-group">
                  <div class="revamp-checkbox-item">
                    <label class="checkbox-container">
                      <input type="checkbox" checked={formState().is_offsite} onChange={e => updateField('is_offsite', e.currentTarget.checked)} />
                      <span class="checkmark"></span>
                      <div class="checkbox-text">
                        <strong>Requires Transport</strong>
                        <p>Enables trip management and driver assignments for this event.</p>
                      </div>
                    </label>
                  </div>

                  <div class="revamp-checkbox-item">
                    <label class="checkbox-container">
                      <input type="checkbox" checked={formState().allow_kit_requests} onChange={e => updateField('allow_kit_requests', e.currentTarget.checked)} />
                      <span class="checkmark"></span>
                      <div class="checkbox-text">
                        <strong>Allow Kit Requests</strong>
                        <p>Allow members to request specific club gear when signing up.</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div class="settings-column">
                <div class="revamp-checkbox-item">
                  <label class="checkbox-container">
                    <input type="checkbox" checked={formState().signup_required} onChange={e => updateField('signup_required', e.currentTarget.checked)} />
                    <span class="checkmark"></span>
                    <div class="checkbox-text">
                      <strong>Limit Attendees</strong>
                      <p>Set a maximum capacity and enable the waiting list functionality.</p>
                    </div>
                  </label>
                  <Show when={formState().signup_required}>
                    <div class="conditional-input-revamp">
                      <label>Maximum Spaces
                        <input type="number" value={formState().max_attendees} onInput={e => updateField('max_attendees', parseInt(e.currentTarget.value) || 0)} placeholder="0 = Unlimited" />
                      </label>
                    </div>
                  </Show>
                </div>

                <div class="revamp-checkbox-item">
                  <label class="checkbox-container">
                    <input type="checkbox" checked={!!formState().upfront_refund_cutoff} onChange={e => updateField('upfront_refund_cutoff', e.currentTarget.checked ? new Date().toISOString() : null)} />
                    <span class="checkmark"></span>
                    <div class="checkbox-text">
                      <strong>Enable Refund Deadline</strong>
                      <p>Specify a time after which upfront costs are no longer automatically refundable.</p>
                    </div>
                  </label>
                  <Show when={!!formState().upfront_refund_cutoff}>
                    <div class="conditional-input-revamp">
                      <label>Refund Cutoff Time
                        <input type="datetime-local" value={formState().upfront_refund_cutoff?.slice(0, 16) || ''} onInput={e => updateField('upfront_refund_cutoff', e.currentTarget.value)} />
                      </label>
                    </div>
                  </Show>
                </div>
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
              value={formState().image_url}
              defaultPreview={props.globalDefaultUrl}
              isDefault={!formState().image_id}
              onImageSelect={({ id, url }) => {
                updateField('image_id', id);
                updateField('image_url', url);
              }}
              onRemove={async () => {
                if (isNew()) {
                  updateField('image_id', null);
                  updateField('image_url', null);
                  return true;
                }
                const ok = await showConfirmModal('Reset Image', 'Remove manual image and reset to default?');
                if (!ok) return false;
                try {
                  await apiRequest('POST', `/api/admin/event/${props.event.id}/reset-image`);
                  updateField('image_id', null);
                  updateField('image_url', null);
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
                    <input type="checkbox" class="hidden-checkbox" checked={selectedTags().includes(tag.id)} onChange={() => toggleTag(tag.id)} />
                    <span class="tag-badge tag-badge-simple" classList={{ selected: selectedTags().includes(tag.id) }} style={{ "--tag-colour": tag.color }}>{tag.name}</span>
                  </label>
                )}
              </For>
            </div>
          </Panel>

                              <Show when={isDirty() || isNew()}>
                                  <div class="floating-action-container">
                                      <button 
                                          type="submit" 
                                          class="floating-save-btn prominent-btn"
                                          title={isNew() ? 'Create Event' : 'Save Changes'}
                                      >
                                          <span innerHTML={SAVE_SVG} />
                                          <span class="btn-label">{isNew() ? 'Create' : 'Save Changes'}</span>
                                      </button>
                                  </div>
                              </Show>        </div>
      </div>
    </form>
  );
}

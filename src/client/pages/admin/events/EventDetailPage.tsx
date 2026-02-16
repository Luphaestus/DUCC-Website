// todo clean up
import { createSignal, createResource, For, Show, createMemo, createEffect } from "solid-js";
import { useParams, useNavigate, useSearchParams } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import {
  FaSolidChevronLeft, FaSolidTrashCan, FaSolidXmark,
  FaSolidCopy, FaSolidCloudArrowDown, FaSolidPoundSign,
  FaSolidCalendarDays, FaSolidFileLines
} from 'solid-icons/fa';
import { MdFillKayaking } from "solid-icons/md";
import DetailsTab from "./tabs/DetailsTab";
import FinanceTab from "./tabs/FinanceTab";
import KitTab from "./tabs/KitTab";
import FormsTab from "./tabs/FormsTab";
import Modal from "@/components/Modal";
import { TabNav } from "@/widgets/TabNav";

import { showConfirmModal } from "@/utils/modal";

export default function EventDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { notify } = useNotifications();
  const id = () => params.id;
  const isNew = () => id() === 'new';

  const currentTab = () => searchParams.tab || 'details';

  const [liveEvent, setLiveEvent] = createSignal<any>(null);

  const [data, { refetch }] = createResource(id, async (eventId) => {
    if (eventId === 'new') {
      const start = searchParams.start || '';
      const end = searchParams.end || '';
      const initial = {
        title: '',
        start,
        end,
        tags: [],
        allow_kit_requests: true,
        costs_released: false
      };
      setLiveEvent(initial);
      return {
        event: initial,
        rawEvent: {},
        allTags: [],
        globalDefaultUrl: '',
        userPerms: []
      };
    }

    const [event, rawEvent, allTagsRes, globalDefaultRes, userPermsRes] = await Promise.all([
      apiRequest('GET', `/api/admin/event/${eventId}`),
      apiRequest('GET', `/api/admin/event/${eventId}/raw`),
      apiRequest('GET', '/api/tags'),
      apiRequest('GET', '/api/globals/DefaultEventImage'),
      apiRequest('GET', '/api/user/elements/permissions')
    ]);

    const fullData = {
      event,
      rawEvent,
      allTags: allTagsRes.data || [],
      globalDefaultUrl: globalDefaultRes.res?.DefaultEventImage?.data || '/api/files/1/download?view=true',
      userPerms: userPermsRes.permissions || []
    };

    setLiveEvent(event);
    return fullData;
  });

  const handleDelete = async () => {
    const ok = await showConfirmModal('Delete Event', 'Delete event permanently? This <strong>cannot be undone</strong>.');
    if (!ok) return;
    try {
      await apiRequest('DELETE', `/api/admin/event/${id()}`);
      notify('Success', 'Event deleted', 'success');
      navigate('/admin/events');
    } catch (err: any) { notify('Error', err.message, 'error'); }
  };

  const handleCancel = async () => {
    const ok = await showConfirmModal('Cancel Event', 'Cancel this event? Attendees will be notified and refunded.');
    if (!ok) return;
    try {
      await apiRequest('POST', `/api/admin/event/${id()}/cancel`);
      notify('Success', 'Event canceled', 'success');
      navigate('/admin/events');
    } catch (e: any) { notify('Error', e.message, 'error'); }
  };

  // Duplicate logic
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = createSignal(false);
  const [duplicateStartTime, setDuplicateStartTime] = createSignal("");
  const [duplicateEndTime, setDuplicateEndTime] = createSignal("");

  const openDuplicateModal = () => {
    const e = data()?.event;
    if (!e) return;

    const oldStart = new Date(e.start);
    const oldEnd = new Date(e.end);
    const duration = oldEnd.getTime() - oldStart.getTime();

    const newStart = new Date(oldStart);
    newStart.setDate(newStart.getDate() + 7);
    const newEnd = new Date(newStart.getTime() + duration);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setDuplicateStartTime(format(newStart));
    setDuplicateEndTime(format(newEnd));
    setIsDuplicateModalOpen(true);
  };

  const handleStartTimeChange = (newVal: string) => {
    const e = data()?.event;
    if (!e) return;

    const oldStart = new Date(e.start);
    const oldEnd = new Date(e.end);
    const duration = oldEnd.getTime() - oldStart.getTime();

    const newStart = new Date(newVal);
    const newEnd = new Date(newStart.getTime() + duration);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setDuplicateStartTime(newVal);
    setDuplicateEndTime(format(newEnd));
  };

  const handleDuplicateConfirm = async (e: Event) => {
    e.preventDefault();
    try {
      const res = await apiRequest('POST', `/api/admin/event/${id()}/duplicate`, {
        start: duplicateStartTime(),
        end: duplicateEndTime()
      });
      notify('Success', 'Event duplicated', 'success');
      setIsDuplicateModalOpen(false);
      navigate(`/admin/event/${res.data.id}`);
    } catch (e: any) { notify('Error', e.message, 'error'); }
  };

  return (
    <Show when={data()} fallback={<p aria-busy="true">Loading...</p>}>
      {res => (
        <div class="dashboard-container">
          <aside class="dashboard-sidebar">
            <TabNav class="vertical-sidebar">
              <button class="nav-item" onClick={() => navigate('/admin/events')}>
                <FaSolidChevronLeft /> Back to Events
              </button>
              <div class="sidebar-spacer" style={{"border-top": "1px solid rgba(var(--pico-color-rgb), 0.1)", "margin": "0.5rem 0"}} />
              
              <button class="nav-item" classList={{ active: currentTab() === 'details' }} onClick={() => setSearchParams({ tab: 'details' })}>
                <FaSolidChevronLeft class="rotate-180" /> Details
              </button>
              <Show when={!isNew()}>
                <button class="nav-item" classList={{ active: currentTab() === 'finance' }} onClick={() => setSearchParams({ tab: 'finance' })}>
                  <FaSolidPoundSign /> Finance
                </button>
                <Show when={liveEvent()?.allow_kit_requests}>
                  <button class="nav-item" classList={{ active: currentTab() === 'kit' }} onClick={() => setSearchParams({ tab: 'kit' })}>
                    <MdFillKayaking /> Kit Requests
                  </button>
                </Show>
                <button class="nav-item" classList={{ active: currentTab() === 'forms' }} onClick={() => setSearchParams({ tab: 'forms' })}>
                  <FaSolidFileLines /> Forms
                </button>

                <div class="sidebar-spacer" style={{"border-top": "1px solid rgba(var(--pico-color-rgb), 0.1)", "margin": "0.5rem 0"}} />

                <button class="nav-item" onClick={openDuplicateModal}>
                  <FaSolidCopy /> Duplicate
                </button>
                <button class="nav-item warning" onClick={handleCancel}>
                  <FaSolidXmark /> Cancel Event
                </button>
                <button class="nav-item delete" onClick={handleDelete}>
                  <FaSolidTrashCan /> Delete Permanently
                </button>
              </Show>
            </TabNav>
          </aside>

          <main class="dashboard-content admin-event-detail-main">
            <div class="tab-content-wrapper">
              <Show when={currentTab() === 'details'}>
                <DetailsTab
                  event={{ ...res().event, image_id: res().rawEvent.image_id }}
                  allTags={res().allTags}
                  globalDefaultUrl={res().globalDefaultUrl}
                  onUpdate={setLiveEvent}
                />
              </Show>
              <Show when={currentTab() === 'finance'}>
                <FinanceTab
                  eventId={parseInt(id() || '0')}
                  isOffsite={res().event.is_offsite}
                  costsReleased={res().event.costs_released}
                  userPerms={res().userPerms}
                />
              </Show>
              <Show when={currentTab() === 'kit'}>
                <KitTab eventId={parseInt(id() || '0')} />
              </Show>
              <Show when={currentTab() === 'forms'}>
                <FormsTab eventId={parseInt(id() || '0')} />
              </Show>
            </div>
          </main>

          <Modal isOpen={isDuplicateModalOpen()} onClose={() => setIsDuplicateModalOpen(false)} title="Duplicate Event">
            <form class="modern-form" onSubmit={handleDuplicateConfirm}>
              <p>Choose the time for the new event. It defaults to next week with the same duration.</p>
              <div class="grid-2-col">
                <label>Start Time
                  <input type="datetime-local" value={duplicateStartTime()} onInput={e => handleStartTimeChange(e.currentTarget.value)} required />
                </label>
                <label>End Time
                  <input type="datetime-local" value={duplicateEndTime()} onInput={e => setDuplicateEndTime(e.currentTarget.value)} required />
                </label>
              </div>
              <div class="form-actions">
                <button type="button" class="secondary" onClick={() => setIsDuplicateModalOpen(false)}>Cancel</button>
                <button type="submit" class="primary">Confirm Duplicate</button>
              </div>
            </form>
          </Modal>
        </div>
      )}
    </Show>
  );
}

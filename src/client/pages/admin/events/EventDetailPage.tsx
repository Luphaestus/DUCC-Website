// todo clean up
import { createSignal, createResource, For, Show, createMemo, createEffect } from "solid-js";
import { useParams, useNavigate, useSearchParams } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { 
    ARROW_BACK_IOS_NEW_SVG, DELETE_HISTORY_SVG, CLOSE_SVG, 
    CONTENT_COPY_SVG, CLOUD_DOWNLOAD_SVG, CURRENCY_POUND_SVG, 
    KAYAKING_SVG, CALENDAR_MONTH_SVG
} from '@/utils/icons';
import DetailsTab from "./tabs/DetailsTab";
import FinanceTab from "./tabs/FinanceTab";
import KitTab from "./tabs/KitTab";
import Panel from "@/components/Panel";
import Modal from "@/components/Modal";
import { TabNav } from "@/widgets/TabNav";
import PageTitle from "@/components/PageTitle";

export default function EventDetailPage() {
    const params = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { notify } = useNotifications();
    const id = () => params.id;
    const isNew = () => id() === 'new';

    const currentTab = () => searchParams.tab || 'details';
    
    // ... data fetching ...
    const [data, { refetch }] = createResource(id, async (eventId) => {
        if (eventId === 'new') {
            const start = searchParams.start || '';
            const end = searchParams.end || '';
            return { 
                event: { 
                    title: '', 
                    start, 
                    end, 
                    tags: [], 
                    allow_kit_requests: true 
                }, 
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

        return {
            event,
            rawEvent,
            allTags: allTagsRes.data || [],
            globalDefaultUrl: globalDefaultRes.res?.DefaultEventImage?.data || '/api/files/1/download?view=true',
            userPerms: userPermsRes.permissions || []
        };
    });

    const handleDelete = async () => {
        if (!confirm('Delete event permanently? This cannot be undone.')) return;
        try {
            await apiRequest('DELETE', `/api/admin/event/${id()}`);
            notify('Success', 'Event deleted', 'success');
            navigate('/admin/events');
        } catch (err: any) { notify('Error', err.message, 'error'); }
    };

    const handleCancel = async () => {
        if (!confirm('Cancel this event? Attendees will be notified and refunded.')) return;
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
        const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

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
        const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

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
                        <div class="event-identity-card user-identity-card flex-column-gap-half mb-4">
                            <div class="event-preview-image event-image-header" style={{ "--event-image-url": `url('${res().event.image_url || res().globalDefaultUrl}')` }}></div>
                            <div class="event-info full-width-center">
                                <h2 class="text-xl m-0">{res().event.title || 'New Event'}</h2>
                                <span class="badge" classList={{ success: res().event.costs_released, neutral: !res().event.costs_released }}>
                                    {res().event.costs_released ? 'Costs Released' : 'Finance Open'}
                                </span>
                            </div>
                        </div>

                        <TabNav class="vertical-sidebar">
                            <button class="nav-item" classList={{ active: currentTab() === 'details' }} onClick={() => setSearchParams({ tab: 'details' })}>
                                <span innerHTML={ARROW_BACK_IOS_NEW_SVG} class="rotate-180" /> Details
                            </button>
                            <Show when={!isNew()}>
                                <button class="nav-item" classList={{ active: currentTab() === 'finance' }} onClick={() => setSearchParams({ tab: 'finance' })}>
                                    <span innerHTML={CURRENCY_POUND_SVG} /> Finance
                                </button>
                                <Show when={res().event.allow_kit_requests}>
                                    <button class="nav-item" classList={{ active: currentTab() === 'kit' }} onClick={() => setSearchParams({ tab: 'kit' })}>
                                        <span innerHTML={KAYAKING_SVG} /> Kit Requests
                                    </button>
                                </Show>
                            </Show>
                        </TabNav>

                        <Show when={!isNew()}>
                            <div class="sidebar-actions mt-4 flex-column-gap-half">
                                <button class="small-btn outline secondary full-width" onClick={openDuplicateModal}><span innerHTML={CONTENT_COPY_SVG} /> Duplicate</button>
                                <button class="small-btn outline warning full-width" onClick={handleCancel}><span innerHTML={CLOSE_SVG} /> Cancel Event</button>
                                <button class="small-btn outline delete full-width" onClick={handleDelete}><span innerHTML={DELETE_HISTORY_SVG} /> Delete Permanently</button>
                            </div>
                        </Show>
                    </aside>

                    <main class="dashboard-content">
                        <div class="flex justify-between align-center mb-4">
                            <button class="small-btn secondary outline" onClick={() => navigate('/admin/events')}>
                                <span innerHTML={ARROW_BACK_IOS_NEW_SVG} /> Back
                            </button>
                        </div>
                        <PageTitle text={isNew() ? 'Create Event' : 'Edit Event'} centered={true} />
                        <div class="mt-6">
                            <Show when={currentTab() === 'details'}>
                                <DetailsTab 
                                    event={{ ...res().event, image_id: res().rawEvent.image_id }} 
                                    allTags={res().allTags} 
                                    globalDefaultUrl={res().globalDefaultUrl} 
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
                        </div>
                    </main>

                    <Modal isOpen={isDuplicateModalOpen()} onClose={() => setIsDuplicateModalOpen(false)} title="Duplicate Event">
                        <form class="modern-form" onSubmit={handleDuplicateConfirm}>
                            <p>Choose the time for the new event. It defaults to next week with the same duration.</p>
                            <div class="grid-2-col mt-4">
                                <label>Start Time
                                    <input type="datetime-local" value={duplicateStartTime()} onInput={e => handleStartTimeChange(e.currentTarget.value)} required />
                                </label>
                                <label>End Time
                                    <input type="datetime-local" value={duplicateEndTime()} onInput={e => setDuplicateEndTime(e.currentTarget.value)} required />
                                </label>
                            </div>
                            <div class="form-actions mt-6">
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

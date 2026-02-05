import { createSignal, createResource, For, Show, createMemo, createEffect } from "solid-js";
import { useParams, useNavigate, useSearchParams } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { ARROW_BACK_IOS_NEW_SVG, DELETE_HISTORY_SVG, CLOSE_SVG, CONTENT_COPY_SVG, CLOUD_DOWNLOAD_SVG } from '@/utils/icons';
import DetailsTab from "./tabs/DetailsTab";
import FinanceTab from "./tabs/FinanceTab";
import KitTab from "./tabs/KitTab";
import Panel from "@/components/Panel";

export default function EventDetailPage() {
    const params = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { notify } = useNotifications();
    const id = () => params.id;
    const isNew = () => id() === 'new';

    const currentTab = () => searchParams.tab || 'details';
    
    // ... data fetching ...
    const [data] = createResource(id, async (eventId) => {
        if (eventId === 'new') return { event: { title: '', start: '', end: '', tags: [] }, rawEvent: {}, allTags: [], globalDefaultUrl: '', userPerms: [] };
        
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
            globalDefaultUrl: globalDefaultRes.res?.DefaultEventImage?.data || '/images/misc/ducc.png',
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

    const handleDuplicate = async () => {
        try {
            const res = await apiRequest('POST', `/api/admin/event/${id()}/duplicate`);
            notify('Success', 'Event duplicated', 'success');
            navigate(`/admin/event/${res.data.id}`);
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    return (
        <>
            <Show when={!isNew()}>
                <div class="admin-header-actions-proxy" style="display: none;">
                    {/* In a real scenario, I'd use a Portal to the layout's action area */}
                </div>
            </Show>

            <Show when={data()} fallback={<p>Loading...</p>}>
                {res => (
                    <Panel class="detail-card">
                        <Show when={!isNew()}>
                            <header style="display:flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 0; padding-bottom: 0; border-bottom: none;">
                                <div class="event-identity">
                                    <h2 class="nomargin">{res().event.title}</h2>
                                    <span class="badge" classList={{ success: res().event.costs_released, neutral: !res().event.costs_released }}>
                                        {res().event.costs_released ? 'Costs Released' : 'Finance Open'}
                                    </span>
                                </div>
                                <div class="tab-nav-simple" style="margin-left: auto; margin-right: auto;">
                                    <button classList={{ active: currentTab() === 'details' }} onClick={() => setSearchParams({ tab: 'details' })}>Edit</button>
                                    <button classList={{ active: currentTab() === 'finance' }} onClick={() => setSearchParams({ tab: 'finance' })}>Finance</button>
                                    <button classList={{ active: currentTab() === 'kit' }} onClick={() => setSearchParams({ tab: 'kit' })}>Kit</button>
                                </div>
                                <div class="button-group">
                                    <a href={`/api/admin/event/${id()}/attendees/csv`} target="_blank" class="small-btn outline" title="Export Attendees CSV">
                                        <span innerHTML={CLOUD_DOWNLOAD_SVG} />
                                    </a>
                                    <button class="small-btn outline secondary" onClick={handleDuplicate} title="Duplicate"><span innerHTML={CONTENT_COPY_SVG} /> Copy</button>
                                    <button class="small-btn outline delete" onClick={handleDelete} title="Delete"><span innerHTML={DELETE_HISTORY_SVG} /> Delete</button>
                                    <button class="small-btn outline warning" onClick={handleCancel} title="Cancel"><span innerHTML={CLOSE_SVG} /> Cancel</button>
                                </div>
                            </header>
                        </Show>

                        <div class="card-body">
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
                    </Panel>
                )}
            </Show>
        </>
    );
}

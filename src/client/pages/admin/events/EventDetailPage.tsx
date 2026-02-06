import { createSignal, createResource, For, Show, createMemo, createEffect } from "solid-js";
import { useParams, useNavigate, useSearchParams } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { 
    ARROW_BACK_IOS_NEW_SVG, DELETE_HISTORY_SVG, CLOSE_SVG, 
    CONTENT_COPY_SVG, CLOUD_DOWNLOAD_SVG, CURRENCY_POUND_SVG, 
    KAYAKING_SVG 
} from '@/utils/icons';
import DetailsTab from "./tabs/DetailsTab";
import FinanceTab from "./tabs/FinanceTab";
import KitTab from "./tabs/KitTab";
import Panel from "@/components/Panel";
import { TabNav } from "@/widgets/TabNav";

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
        <Show when={data()} fallback={<p aria-busy="true">Loading...</p>}>
            {res => (
                <div class="dashboard-container">
                    <aside class="dashboard-sidebar">
                        <div class="event-identity-card" style={{ 
                            background: "var(--glass-bg)", 
                            border: "var(--glass-border)", 
                            padding: "1.5rem", 
                            "border-radius": "var(--border-radius-lg)",
                            display: "flex",
                            "flex-direction": "column",
                            "align-items": "center",
                            gap: "1rem",
                            "backdrop-filter": "blur(12px)",
                            "margin-bottom": "1rem"
                        }}>
                            <div class="event-preview-image" style={{
                                width: "100%",
                                height: "120px",
                                "border-radius": "var(--border-radius-md)",
                                "background-image": `url('${res().event.image_url || res().globalDefaultUrl}')`,
                                "background-size": "cover",
                                "background-position": "center"
                            }}></div>
                            <div class="event-info" style={{ "text-align": "center" }}>
                                <h2 style={{ margin: 0, "font-size": "1.25rem" }}>{res().event.title || 'New Event'}</h2>
                                <span class="badge" classList={{ success: res().event.costs_released, neutral: !res().event.costs_released }}>
                                    {res().event.costs_released ? 'Costs Released' : 'Finance Open'}
                                </span>
                            </div>
                        </div>

                        <TabNav class="vertical-sidebar">
                            <button class="nav-item" classList={{ active: currentTab() === 'details' }} onClick={() => setSearchParams({ tab: 'details' })}>
                                <span innerHTML={ARROW_BACK_IOS_NEW_SVG} style={{ transform: "rotate(180deg)" }} /> Details
                            </button>
                            <Show when={!isNew()}>
                                <button class="nav-item" classList={{ active: currentTab() === 'finance' }} onClick={() => setSearchParams({ tab: 'finance' })}>
                                    <span innerHTML={CURRENCY_POUND_SVG} /> Finance
                                </button>
                                <button class="nav-item" classList={{ active: currentTab() === 'kit' }} onClick={() => setSearchParams({ tab: 'kit' })}>
                                    <span innerHTML={KAYAKING_SVG} /> Kit Requests
                                </button>
                            </Show>
                        </TabNav>

                        <Show when={!isNew()}>
                            <div class="sidebar-actions mt-4" style={{ display: "flex", "flex-direction": "column", gap: "0.5rem" }}>
                                <a href={`/api/admin/event/${id()}/attendees/csv`} target="_blank" class="small-btn outline full-width" style={{ "text-align": "center", display: "block" }}>
                                    <span innerHTML={CLOUD_DOWNLOAD_SVG} /> Export CSV
                                </a>
                                <button class="small-btn outline secondary full-width" onClick={handleDuplicate}><span innerHTML={CONTENT_COPY_SVG} /> Duplicate</button>
                                <button class="small-btn outline warning full-width" onClick={handleCancel}><span innerHTML={CLOSE_SVG} /> Cancel Event</button>
                                <button class="small-btn outline delete full-width" onClick={handleDelete}><span innerHTML={DELETE_HISTORY_SVG} /> Delete Permanently</button>
                            </div>
                        </Show>
                    </aside>

                    <main class="dashboard-content">
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
                    </main>
                </div>
            )}
        </Show>
    );
}

// todo clean up
import { createSignal, createResource, onMount, For, Show, createMemo, onCleanup, Switch, Match } from "solid-js";
import { Portal } from "solid-js/web";
import { useParams, useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import {
    BRIGHTNESS_ALERT_SVG, BOLT_SVG, GROUP_SVG, HOURGLASS_TOP_SVG, CURRENCY_POUND_SVG, INFO_SVG,
    CLOSE_SVG, AVG_PACE_SVG, CALENDAR_MONTH_SVG, LOCATION_ON_SVG, WALLET_SVG, SCHEDULE_SVG,
    DESCRIPTION_SVG, TRIP_SVG, SETTINGS_SVG, KAYAKING_SVG
} from '@/utils/icons';
import { Tag } from '../widgets/Tag';
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import { onUpdate } from "@/utils/updates";
import { incrementModals, decrementModals } from "@/utils/modal-state";

interface KitVariant {
    id: number;
    name: string;
}

interface KitItem {
    id: number;
    name: string;
    type: string;
    variants: KitVariant[];
}

interface KitRequest {
    id: number;
    kit_item_id: number;
    kit_variant_id: number | null;
}

export default function EventDetailPage() {
    const params = useParams();
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const eventId = () => params.id;
    
    const [isKitModalOpen, setIsKitModalOpen] = createSignal(false);
    const [activeKitItem, setActiveKitItem] = createSignal<KitItem | null>(null);

    // ... existing onMount/cleanup ...

    const [eventData, { refetch: refetchEvent, mutate: mutateEvent }] = createResource(eventId, async (id) => {
        const res = await apiRequest('GET', `/api/event/${id}`, null, true);
        return res.event;
    });

    const [attendees, { refetch: refetchAttendees, mutate: mutateAttendees }] = createResource(eventId, async (id) => {
        const res = await apiRequest('GET', `/api/event/${id}/attendees`, null, true);
        return res.attendees || [];
    });

    const [userStatus] = createResource(async () => {
        const auth = await apiRequest('GET', '/api/auth/status', null, true).catch(() => ({ authenticated: false }));
        if (!auth.authenticated) return null;
        return await apiRequest('GET', '/api/user/elements/filled_legal_info,balance,is_member,free_sessions,is_instructor,permissions,id');
    });

    const [kitItems] = createResource(userStatus, async (status) => {
        if (!status) return [];
        try {
            const res = await apiRequest('GET', '/api/kit', null, true);
            return res || [];
        } catch { return []; }
    });

    const [userKitRequests, { refetch: refetchUserKit }] = createResource(
        () => ({ id: eventId(), user: userStatus() }),
        async ({ id, user }) => {
            if (!id || !user) return [];
            try {
                const res = await apiRequest('GET', `/api/kit/event/${id}/my-request`, null, true);
                return (res || []) as KitRequest[];
            } catch { return []; }
        }
    );

    const canManage = createMemo(() => (userStatus()?.permissions?.length || 0) > 0);
    const isAttending = createMemo(() => attendees()?.some((a: any) => a.id === userStatus()?.id && (a.is_attending === undefined || a.is_attending === 1)));

    const eventStatus = createMemo(() => {
        const e = eventData();
        if (!e) return 'loading';
        const now = new Date();
        if (now >= new Date(e.end)) return 'ended';
        if (now >= new Date(e.start)) return 'started';
        if (e.is_canceled) return 'canceled';
        if (e.max_attendees > 0 && (e.attendee_count || 0) >= e.max_attendees) return 'full';
        return 'open';
    });

    const handleAttend = async () => {
        if (!userStatus()) {
            navigate('/login');
            return;
        }
        try {
            await apiRequest('POST', `/api/event/${eventId()}/attend`, {});
            notify('Success', 'Joined event!', 'success');
            refetchAttendees();
            refetchEvent();
            refetchUserKit();
        } catch (e: any) {
            notify('Error', e.message, 'error');
        }
    };

    const openVariantModal = (item: KitItem) => {
        setActiveKitItem(item);
        setIsKitModalOpen(true);
    };

    const handleSelectVariant = async (variantId: number | null) => {
        const item = activeKitItem();
        if (!item) return;

        // Update locally first for snappiness if possible, but let's just use the API
        const currentRequests = userKitRequests() || [];
        const existing = currentRequests.find(r => r.kit_item_id === item.id);

        let newSelections;
        if (variantId === -1) {
            // Deselect item
            newSelections = currentRequests.filter(r => r.kit_item_id !== item.id)
                .map(r => ({ kit_item_id: r.kit_item_id, kit_variant_id: r.kit_variant_id }));
        } else {
            const newSelection = { kit_item_id: item.id, kit_variant_id: variantId };
            if (existing) {
                newSelections = currentRequests.map(r => r.kit_item_id === item.id ? newSelection : { kit_item_id: r.kit_item_id, kit_variant_id: r.kit_variant_id });
            } else {
                newSelections = [...currentRequests.map(r => ({ kit_item_id: r.kit_item_id, kit_variant_id: r.kit_variant_id })), newSelection];
            }
        }

        try {
            await apiRequest('POST', '/api/kit/event-request', { event_id: eventId(), selections: newSelections });
            notify('Success', 'Kit preference updated', 'success');
            setIsKitModalOpen(false);
            refetchUserKit();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    const handleBackdropClick = (e: MouseEvent) => {
        if (e.target === e.currentTarget) {
            navigate(-1);
        }
    };

        return (

            <Portal>

                <div id="event-view" class="view c-modal-overlay visible" onClick={handleBackdropClick}>

                    <div class="c-modal-content modal-lg">

                        <button class="c-modal-close-btn" onClick={() => navigate(-1)} innerHTML={CLOSE_SVG} />

                        <Show when={eventData()} fallback={<div id="event-detail" class="c-modal-body"><p aria-busy="true">Loading event...</p></div>}>

                            {(event) => (

                                <div id="event-detail">

                                    <div class="event-modal-header event-image-header" style={{ "--event-image-url": `url('${event().image_url || '/api/files/1/download?view=true'}')` }}>

                                        <div class="header-content">

                                            <div class="event-tags">

                                                <For each={event().tags}>

                                                    {(tag) => <Tag name={tag.name} color={tag.color} dimmed={true} />}

                                                </For>

                                            </div>

                                            <h2 class="event-title">{event().title}</h2>

                                            <p class="event-location"><span innerHTML={LOCATION_ON_SVG} /> {event().location || 'Location TBD'}</p>

                                        </div>

                                    </div>

    

                                    <div class="event-modal-body">

                                        <div class="event-info-boxes">

                                            <div class="info-box">

                                                <span class="box-title"><span innerHTML={CALENDAR_MONTH_SVG} /> DATE</span>

                                                <span class="box-value">{new Date(event().start).toLocaleDateString()}</span>

                                            </div>

                                            <div class="info-box">

                                                <span class="box-title"><span innerHTML={SCHEDULE_SVG} /> DURATION</span>

                                                <span class="box-value">

                                                    {(() => {

                                                        const diff = new Date(event().end).getTime() - new Date(event().start).getTime();

                                                        const hours = diff / (1000 * 60 * 60);

                                                        return hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1);

                                                    })()} hrs

                                                </span>

                                            </div>

                                            <div class="info-box">

                                                <span class="box-title"><span innerHTML={CURRENCY_POUND_SVG} /> PRICE</span>

                                                <span class="box-value">{event().upfront_cost > 0 ? `£${event().upfront_cost.toFixed(2)}` : 'Free'}</span>

                                            </div>

                                            <div class="info-box">

                                                <span class="box-title"><span innerHTML={GROUP_SVG} /> CAPACITY</span>

                                                <span class="box-value">{event().attendee_count || 0}/{event().max_attendees || '∞'}</span>

                                            </div>

                                        </div>

    

                                        <div class="liquid-container event-details-content" style={{ "--liquid-padding": "1.25rem" }}>

                                            <div class="description-section">

                                                <h3 class="section-title"><span innerHTML={DESCRIPTION_SVG} /> Description</h3>

                                                <p class="description-text">{event().description || 'No description provided.'}</p>

                                            </div>

    

                                            <div class="attendees-section">

                                                <h3 class="section-title"><span innerHTML={GROUP_SVG} /> Attendees</h3>

                                                <div class="attendee-bubbles">

                                                    <For each={attendees()}>

                                                        {(a) => (

                                                            <div class="attendee-bubble" title={`${a.first_name} ${a.last_name}`}>

                                                                <Avatar user={a} classes="mini" />

                                                            </div>

                                                        )}

                                                    </For>

                                                </div>

                                            </div>

                                        </div>

    

                                        <div class="event-actions">
                                            <Show when={!isAttending()}>
                                                <Switch>
                                                    <Match when={eventStatus() === 'ended'}>
                                                        <button class="secondary outline" disabled>Event Ended</button>
                                                    </Match>
                                                    <Match when={eventStatus() === 'started'}>
                                                        <button class="secondary outline" disabled>Already Started</button>
                                                    </Match>
                                                    <Match when={eventStatus() === 'canceled'}>
                                                        <button class="secondary outline" disabled>Canceled</button>
                                                    </Match>
                                                    <Match when={eventStatus() === 'full'}>
                                                        <button class="secondary outline" disabled>Event Full</button>
                                                    </Match>
                                                    <Match when={eventStatus() === 'open'}>
                                                        <button class="primary" onClick={handleAttend}>Join Event</button>
                                                    </Match>
                                                </Switch>
                                            </Show>

                                            <Show when={isAttending()}>
                                                <button class="secondary outline" disabled>Joined</button>
                                                <Show when={eventStatus() !== 'ended'}>
                                                    <div class="kit-selection-buttons" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem;">
                                                        <For each={kitItems() || []}>
                                                            {(item) => {
                                                                const request = createMemo(() => userKitRequests()?.find(r => r.kit_item_id === item.id));
                                                                const isSelected = () => !!request();
                                                                const variantName = () => {
                                                                    const r = request();
                                                                    if (!r) return '';
                                                                    if (r.kit_variant_id === null) return ' (Not Sure)';
                                                                    const v = item.variants.find(v => v.id === r.kit_variant_id);
                                                                    return v ? ` (${v.name})` : ' (Not Sure)';
                                                                };

                                                                return (
                                                                    <button 
                                                                        class={isSelected() ? "primary" : "secondary outline"} 
                                                                        onClick={() => openVariantModal(item)}
                                                                        title={`Borrow ${item.name}`}
                                                                    >
                                                                        <span innerHTML={KAYAKING_SVG} /> {item.name}{variantName()}
                                                                    </button>
                                                                );
                                                            }}
                                                        </For>
                                                    </div>
                                                </Show>
                                            </Show>

                                            <Show when={canManage()}>
                                                <button class="secondary" onClick={() => navigate(`/admin/event/${event().id}`)}>
                                                    <span innerHTML={SETTINGS_SVG} /> Edit
                                                </button>
                                            </Show>
                                        </div>

                                    </div>

                                </div>

                            )}

                        </Show>

    

                        <Modal isOpen={isKitModalOpen()} onClose={() => setIsKitModalOpen(false)} title={`Borrow ${activeKitItem()?.name}`}>
                            <div class="variant-selection">
                                <p>Select a size or variant for {activeKitItem()?.name}:</p>
                                <div class="item-list mb-4">
                                    <For each={activeKitItem()?.variants || []}>
                                        {(variant) => (
                                            <button 
                                                class="list-item clickable" 
                                                onClick={() => handleSelectVariant(variant.id)}
                                            >
                                                <div class="item-details">
                                                    <span class="item-title">{variant.name}</span>
                                                </div>
                                            </button>
                                        )}
                                    </For>
                                    <button 
                                        class="list-item clickable" 
                                        onClick={() => handleSelectVariant(null)}
                                    >
                                        <div class="item-details">
                                            <span class="item-title">Don't Know / Not Sure</span>
                                            <span class="item-subtitle">We'll help you pick at the event</span>
                                        </div>
                                    </button>
                                    
                                    <Show when={userKitRequests()?.some(r => r.kit_item_id === activeKitItem()?.id)}>
                                        <button 
                                            class="list-item clickable danger-hover" 
                                            onClick={() => handleSelectVariant(-1)}
                                            style="margin-top: 1rem; border-color: var(--error-color);"
                                        >
                                            <div class="item-details">
                                                <span class="item-title" style="color: var(--error-color);">Remove Request</span>
                                            </div>
                                        </button>
                                    </Show>
                                </div>
                            </div>
                        </Modal>

                    </div>

                </div>

            </Portal>

        );

    }

    
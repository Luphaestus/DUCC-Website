// todo clean up
import { createSignal, createResource, onMount, For, Show, createMemo, onCleanup, Switch, Match } from "solid-js";
import { Portal } from "solid-js/web";
import { useParams, useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import {
    BRIGHTNESS_ALERT_SVG, BOLT_SVG, GROUP_SVG, HOURGLASS_TOP_SVG, CURRENCY_POUND_SVG, INFO_SVG,
    CLOSE_SVG, AVG_PACE_SVG, CALENDAR_MONTH_SVG, LOCATION_ON_SVG, WALLET_SVG, SCHEDULE_SVG,
    DESCRIPTION_SVG, TRIP_SVG, SETTINGS_SVG, KAYAKING_SVG, LIST_SVG, ARROW_BACK_IOS_NEW_SVG
} from '@/utils/icons';
import { Tag } from '../widgets/Tag';
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import Markdown from "@/components/Markdown";
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
    const [isAttendeesExpanded, setIsAttendeesExpanded] = createSignal(false);

    const [eventData, { refetch: refetchEvent }] = createResource(eventId, async (id) => {
        const res = await apiRequest('GET', `/api/event/${id}`, null, true);
        return res.event;
    });

    const [attendees, { refetch: refetchAttendees }] = createResource(eventId, async (id) => {
        const res = await apiRequest('GET', `/api/event/${id}/attendees`, null, true);
        return res.attendees || [];
    });

    const [coachCount, { refetch: refetchCoachCount }] = createResource(eventId, async (id) => {
        const res = await apiRequest('GET', `/api/event/${id}/coachCount`, null, true);
        return res.count;
    });

    const [isOnWaitlist, { refetch: refetchWaitlist }] = createResource(eventId, async (id) => {
        const res = await apiRequest('GET', `/api/event/${id}/isOnWaitlist`, null, true);
        return res.isOnWaitlist;
    });

    const [userStatus] = createResource(async () => {
        const auth = await apiRequest('GET', '/api/auth/status', null, true).catch(() => ({ authenticated: false }));
        if (!auth.authenticated) return null;
        return await apiRequest('GET', '/api/user/elements/filled_legal_info,balance,is_member,free_sessions,is_instructor,permissions,id');
    });

    const [debtLimit] = createResource(async () => {
        try {
            const res = await apiRequest('GET', '/api/globals/MinMoney');
            return Number(res.res?.MinMoney?.data || -25);
        } catch { return -25; }
    });

    const [allowFreeSignupsInDebt] = createResource(async () => {
        try {
            const res = await apiRequest('GET', '/api/globals/AllowFreeSignupsInDebt');
            return Number(res.res?.AllowFreeSignupsInDebt?.data || 0) === 1;
        } catch { return false; }
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

    const joinButtonInfo = createMemo(() => {
        const status = eventStatus();
        const user = userStatus();
        const event = eventData();
        const coaches = coachCount() || 0;
        const waiting = isOnWaitlist();

        if (status === 'ended') {
            return { text: 'Event Ended', disabled: true, class: 'secondary outline' };
        }

        const refundCutoff = event?.upfront_refund_cutoff ? new Date(event.upfront_refund_cutoff) : null;
        const refundPassed = refundCutoff && new Date() > refundCutoff;

        if (isAttending()) {
            return {
                text: 'Leave Event',
                action: handleLeave,
                class: 'secondary outline',
                message: refundPassed ? 'The refund deadline has passed. If you leave now, you may not receive a refund.' : null
            };
        }

        if (!user) {
            return { text: 'Join Event', disabled: false, class: 'primary' };
        }

        if (!user.filled_legal_info) {
            return {
                text: 'Membership Form',
                action: () => navigate('/legal'),
                class: 'primary',
                message: 'You must complete the membership form before joining an event.'
            };
        }

        if (coaches === 0 && !user.is_instructor) {
            return {
                text: 'No Coach Attending',
                disabled: true,
                class: 'secondary outline',
                message: 'This event requires a coach to attend. Once a coach joins, you will be able to sign up.'
            };
        }

        const limit = debtLimit() || -25;
        const upfrontCost = Number(event?.upfront_cost || 0);
        if (user.balance - upfrontCost < limit) {
            const allowFree = allowFreeSignupsInDebt();
            if (!(allowFree && upfrontCost === 0)) {
                return {
                    text: 'Top Up Balance',
                    action: () => navigate('/profile/balance'),
                    class: 'warning',
                    message: `You need to top up your balance to join this event. Joining would put you below your debt limit of £${limit.toFixed(2)}.`
                };
            }
        }

        if (status === 'full') {
            if (waiting) {
                return {
                    text: 'On Waitlist',
                    action: handleLeaveWaitlist,
                    class: 'secondary outline',
                    message: 'You are currently on the waitlist for this event.'
                };
            }
            return {
                text: 'Join Waitlist',
                action: handleJoinWaitlist,
                class: 'warning',
                message: 'This event is currently full. You can join the waitlist.'
            };
        }

        return {
            text: 'Join Event',
            action: handleAttend,
            class: 'primary',
            message: refundPassed ? 'The refund deadline for this event has passed. If you join and then leave, you may not be refunded.' : null
        };
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
            refetchCoachCount();
        } catch (e: any) {
            notify('Error', e.message, 'error');
        }
    };

    const handleLeave = async () => {
        try {
            await apiRequest('POST', `/api/event/${eventId()}/leave`, {});
            notify('Success', 'Left event', 'success');
            refetchAttendees();
            refetchEvent();
            refetchUserKit();
            refetchCoachCount();
        } catch (e: any) {
            notify('Error', e.message, 'error');
        }
    };

    const handleJoinWaitlist = async () => {
        try {
            await apiRequest('POST', `/api/event/${eventId()}/waitlist/join`, {});
            notify('Success', 'Joined waitlist!', 'success');
            refetchWaitlist();
            refetchEvent();
        } catch (e: any) {
            notify('Error', e.message, 'error');
        }
    };

    const handleLeaveWaitlist = async () => {
        try {
            await apiRequest('POST', `/api/event/${eventId()}/waitlist/leave`, {});
            notify('Success', 'Left waitlist', 'success');
            refetchWaitlist();
            refetchEvent();
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



                                    <div class="liquid-container event-details-content">

                                        <div class="description-section">

                                            <h3 class="section-title"><span innerHTML={DESCRIPTION_SVG} /> Description</h3>

                                            <div class="description-text">
                                                <Markdown content={event().description || 'No description provided.'} />
                                            </div>

                                        </div>



                                        <div class="attendees-section">
                                            <h3 class="section-title"><span innerHTML={GROUP_SVG} /> Attendees ({attendees()?.length || 0})</h3>

                                            <div class="attendee-list-modern" classList={{ expanded: isAttendeesExpanded() }}>
                                                <For each={attendees()}>
                                                    {(a) => (
                                                        <div class="attendee-row">
                                                            <Avatar user={a} classes="mini" />
                                                            <span class="attendee-name">{a.first_name} {a.last_name}</span>
                                                        </div>
                                                    )}
                                                </For>
                                            </div>

                                            <Show when={(attendees()?.length || 0) > 6}>
                                                <button class="expand-attendees-btn" onClick={() => setIsAttendeesExpanded(!isAttendeesExpanded())}>
                                                    {isAttendeesExpanded() ? 'Show Less' : `Show All (${attendees()?.length})`}
                                                </button>
                                            </Show>
                                        </div>

                                    </div>



                                    <div class="event-actions-container">
                                        <Show when={joinButtonInfo().message}>
                                            <div class="action-notice">
                                                <span innerHTML={INFO_SVG} />
                                                <p>{joinButtonInfo().message}</p>
                                            </div>
                                        </Show>

                                        <div class="event-actions">
                                            <Show when={userStatus()} fallback={
                                                <div class="auth-actions" style="display: flex; gap: 1rem; width: 100%;">
                                                    <button class="primary" style="flex: 1;" onClick={() => navigate('/login')}>Sign In</button>
                                                    <button class="secondary" style="flex: 1;" onClick={() => navigate('/signup')}>Sign Up</button>
                                                </div>
                                            }>
                                                <button
                                                    class={joinButtonInfo().class}
                                                    onClick={joinButtonInfo().action}
                                                    disabled={joinButtonInfo().disabled}
                                                >
                                                    {joinButtonInfo().text}
                                                </button>
                                            </Show>

                                            <Show when={isAttending() && event().is_offsite && eventStatus() === 'open'}>
                                                <button class="secondary outline" onClick={() => setIsKitModalOpen(true)}>
                                                    <span innerHTML={KAYAKING_SVG} /> Request Kit
                                                </button>
                                            </Show>

                                            <Show when={canManage()}>
                                                <button class="secondary" onClick={() => navigate(`/admin/event/${event().id}`)}>
                                                    <span innerHTML={SETTINGS_SVG} /> Edit
                                                </button>
                                            </Show>
                                        </div>
                                    </div>

                                </div>

                            </div>

                        )}

                    </Show>



                    <Modal isOpen={isKitModalOpen()} onClose={() => { setIsKitModalOpen(false); setActiveKitItem(null); }} title="Request Kit">
                        <Show when={!activeKitItem()} fallback={
                            <div class="variant-selection">
                                <button class="small-btn secondary" onClick={() => setActiveKitItem(null)}>
                                    <span innerHTML={ARROW_BACK_IOS_NEW_SVG} /> Back to Items
                                </button>
                                <p>Select a size or variant for {activeKitItem()?.name}:</p>
                                <div class="item-list">
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
                        }>
                            <div class="kit-items-list item-list">
                                <For each={kitItems() || []}>
                                    {(item) => {
                                        const request = createMemo(() => userKitRequests()?.find(r => r.kit_item_id === item.id));
                                        const isSelected = () => !!request();
                                        const variantName = () => {
                                            const r = request();
                                            if (!r) return '';
                                            if (r.kit_variant_id === null) return ' (Not Sure)';
                                            const v = item.variants.find((v: KitVariant) => v.id === r.kit_variant_id);
                                            return v ? ` (${v.name})` : ' (Not Sure)';
                                        };

                                        return (
                                            <button class="list-item clickable" onClick={() => setActiveKitItem(item)}>
                                                <div class="item-details">
                                                    <span class="item-title">{item.name}{variantName()}</span>
                                                    <span class="item-subtitle">{isSelected() ? 'Selected' : 'Not Selected'}</span>
                                                </div>
                                            </button>
                                        );
                                    }}
                                </For>
                            </div>
                        </Show>
                    </Modal>

                </div>

            </div>

        </Portal>

    );

}


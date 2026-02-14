// todo clean up
import { createSignal, createResource, For, Show, createMemo, createEffect } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import {
    CURRENCY_POUND_SVG, ADD_SVG, TRIP_SVG, CHECK_SVG,
    CLOSE_SVG, EDIT_SVG, GROUP_SVG, WALLET_SVG, DELETE_SVG, CLOUD_DOWNLOAD_SVG
} from '@/utils/icons';
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import Panel from "@/components/Panel";
import Pagination from "@/components/Pagination";
import PaginationSlider from "@/components/PaginationSlider";
import { showConfirmModal } from "@/utils/modal";
import { notify } from '@/components/notification'

// --- Types ---
interface Attendee {
    id: number;
    first_name: string;
    last_name: string;
    email?: string;
    is_attending: boolean;
    upfront_refunded: boolean;
    payment_transaction_id?: number;
}

interface Driver {
    id: number;
    trip_id: number;
    name: string;
    miles: number;
    reimbursement: number;
    status: string;
    seats: number;
    boats: number;
    car_name: string;
    start_mileage: number | null;
    end_mileage: number | null;
    user_id: number;
    first_name: string;
    last_name: string;
}

interface Trip {
    id: number;
    name: string;
    total_reimbursement: number;
    share: number;
    drivers: Driver[];
    eligible_count: number;
}

interface Expense {
    id: number;
    amount: number;
    description: string;
    share: number;
    payer_id: number;
    payer_name: string;
    eligible_count: number;
    first_name: string;
}

interface FinanceSummary {
    breakdown: any[];
    trips: Trip[];
    expenses: Expense[];
    released_at?: string;
}

// --- Component ---

export default function FinanceTab(props: { eventId: number, isOffsite: boolean, costsReleased: boolean, userPerms: string[] }) {
    const { notify } = useNotifications();
    const [attendeePage, setAttendeePage] = createSignal(1);
    const [attendeeFilter, setAttendeeFilter] = createSignal('');
    const [oldAttendees, setOldAttendees] = createSignal<Attendee[] | null>(null);

    // --- Modals State ---
    const [showAddAttendee, setShowAddAttendee] = createSignal(false);
    const [showAddTrip, setShowAddTrip] = createSignal(false);
    const [showAddExpense, setShowAddExpense] = createSignal(false);
    const [manageDriversTripId, setManageDriversTripId] = createSignal<number | null>(null);
    const [exclusionsData, setExclusionsData] = createSignal<{ type: 'trip' | 'expense', id: number } | null>(null);

    // --- Data Resources ---
    const [attendees, { refetch: refetchAttendees }] = createResource(async () => {
        const res = await apiRequest('GET', `/api/event/${props.eventId}/attendees`);
        return (res.attendees || []) as Attendee[];
    });

    const [trips, { refetch: refetchTrips }] = createResource(async () => {
        if (!props.isOffsite) return [] as Trip[];
        const res = await apiRequest('GET', `/api/events/${props.eventId}/trips`);
        return (res.data || []) as Trip[];
    });

    const [drivers, { refetch: refetchDrivers }] = createResource(async () => {
        if (!props.isOffsite) return [] as Driver[];
        const res = await apiRequest('GET', `/api/admin/events/${props.eventId}/drivers`);
        return (res.data || []) as Driver[];
    });

    const [expenses, { refetch: refetchExpenses }] = createResource(async () => {
        const res = await apiRequest('GET', `/api/events/${props.eventId}/expenses`);
        return (res.data || []) as Expense[];
    });

    const [summary, { refetch: refetchSummary }] = createResource(async () => {
        const res = await apiRequest('GET', `/api/admin/events/${props.eventId}/finance-summary`);
        return (res.data || { breakdown: [] }) as FinanceSummary;
    });

    const refreshAll = () => {
        refetchAttendees();
        refetchTrips();
        refetchDrivers();
        refetchExpenses();
        refetchSummary();
    };

    // --- Computed ---
    const filteredAttendees = createMemo(() => {
        const list = attendees() || [];
        const filter = attendeeFilter().toLowerCase();
        return list.filter(a =>
            `${a.first_name} ${a.last_name}`.toLowerCase().includes(filter) ||
            (a.email && a.email.toLowerCase().includes(filter))
        );
    });

    const displayAttendees = createMemo(() => {
        const list = filteredAttendees();
        const start = (attendeePage() - 1) * 5;
        return list.slice(start, start + 5);
    });

    const totalAttendeePages = createMemo(() => Math.ceil(filteredAttendees().length / 5));

    // Handle capturing old data for slider
    let lastPageNum = attendeePage();
    createEffect(() => {
        const current = attendeePage();
        if (current !== lastPageNum) {
            const list = filteredAttendees();
            const start = (lastPageNum - 1) * 5;
            setOldAttendees(list.slice(start, start + 5));
            lastPageNum = current;
        }
    });

    // --- Actions ---
    const handleRemoveAttendee = async (id: number) => {
        const ok = await showConfirmModal('Remove Participant', 'Are you sure you want to remove this participant from the event?');
        if (!ok) return;
        try {
            await apiRequest('DELETE', `/api/admin/events/${props.eventId}/attendees/${id}`);
            notify('Success', 'Removed.', 'success');
            refreshAll();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    const handleRefundUpfront = async (id: number) => {
        const ok = await showConfirmModal('Refund Upfront Fee', 'Refund the upfront fee for this participant?');
        if (!ok) return;
        try {
            await apiRequest('POST', `/api/admin/events/${props.eventId}/attendees/${id}/refund-upfront`);
            notify('Success', 'Refunded.', 'success');
            refreshAll();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    const handleReleaseCosts = async () => {
        const ok = await showConfirmModal(
            'Release Funds',
            'Finalize the budget and update all member balances? <strong>This cannot be undone.</strong>'
        );
        if (!ok) return;
        try {
            await apiRequest('POST', `/api/admin/events/${props.eventId}/release-costs`);
            notify('Success', 'Funds released successfully.', 'success');
            window.location.reload();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    const totals = createMemo(() => {
        const b = summary()?.breakdown || [];
        return {
            contributed: b.reduce((sum, row) => sum + row.spent + row.mileage, 0),
            shared: b.reduce((sum, row) => sum + row.shared_cost_share, 0),
            participants: b.length
        };
    });

    const AttendeeTable = (innerProps: { list: Attendee[] }) => (
        <table class="glass-table">
            <thead>
                <tr><th>Attendee</th><th>Status</th><th class="text-right">Action</th></tr>
            </thead>
            <tbody>
                <For each={innerProps.list}>
                    {a => (
                        <tr><td class="primary-text">
                            <div class="user-info-cell">
                                <Avatar user={a} classes="mini" />
                                <span>{a.first_name} {a.last_name}</span>
                            </div>
                        </td>
                            <td>
                                <Show when={a.is_attending} fallback={<span class="badge neutral">Left{a.upfront_refunded ? ' - Refunded' : ''}</span>}>
                                    <span class="badge success">Attending{a.upfront_refunded ? ' - Refunded' : ''}</span>
                                </Show>
                            </td>
                            <td class="text-right">
                                <div class="button-group mini justify-end">
                                    <Show when={a.is_attending && !props.costsReleased}>
                                        <button class="small-btn outline delete" onClick={() => handleRemoveAttendee(a.id)}>Remove</button>
                                    </Show>
                                    <Show when={((props.userPerms || []).includes('transaction.manage') || (props.userPerms || []).includes('event.manage.all')) && a.payment_transaction_id && !a.upfront_refunded}>
                                        <button class="small-btn outline secondary" onClick={() => handleRefundUpfront(a.id)}>Refund</button>
                                    </Show>
                                </div>
                            </td>
                        </tr>
                    )}
                </For>
                <Show when={innerProps.list.length === 0}>
                    <tr><td colspan="3" class="empty-cell">No participants found.</td></tr>
                </Show>
            </tbody>
        </table>
    );

    return (
        <div class="finance-management-layout flex-column gap-6">
            <div class="finance-status-header">
                <Panel>
                    <div class="flex-between align-center p-4">
                        <div class="flex align-center gap-6">
                            <div class="flex-column">
                                <span class="text-muted small-text uppercase font-bold tracking-wider mb-1">Financial State</span>
                                <div class="flex align-center gap-2">
                                    <div class={`status-indicator ${props.costsReleased ? 'success' : 'warning'}`}></div>
                                    <span class="font-bold">{props.costsReleased ? 'Settlement Finalized' : 'Draft / Open for Edits'}</span>
                                </div>
                            </div>
                            <Show when={props.costsReleased}>
                                <div class="divider-vertical"></div>
                                <div class="flex-column">
                                    <span class="text-muted small-text uppercase font-bold tracking-wider mb-1">Finalized On</span>
                                    <span class="font-bold">{new Date(summary()?.released_at || '').toLocaleDateString()}</span>
                                </div>
                            </Show>
                        </div>
                        <div class="flex align-center gap-2">
                            <a href={`/api/admin/event/${props.eventId}/attendees/csv`} target="_blank" class="small-btn secondary outline">
                                <span innerHTML={CLOUD_DOWNLOAD_SVG} /> Export CSV
                            </a>
                            <Show when={!props.costsReleased}>
                                <button class="small-btn primary" onClick={handleReleaseCosts}>
                                    Release Funds
                                </button>
                            </Show>
                        </div>
                    </div>
                </Panel>
            </div>

            <div class="finance-summary-grid">
                <div class="liquid-container summary-card">
                    <span class="card-icon" innerHTML={WALLET_SVG} />
                    <div class="card-info">
                        <span class="label">Total Contributed</span>
                        <span class="value">£{totals().contributed.toFixed(2)}</span>
                    </div>
                </div>
                <div class="liquid-container summary-card">
                    <span class="card-icon" innerHTML={CURRENCY_POUND_SVG} />
                    <div class="card-info">
                        <span class="label">Shared Costs</span>
                        <span class="value">£{totals().shared.toFixed(2)}</span>
                    </div>
                </div>
                <div class="liquid-container summary-card">
                    <span class="card-icon" innerHTML={GROUP_SVG} />
                    <div class="card-info">
                        <span class="label">Participants</span>
                        <span class="value">{totals().participants}</span>
                    </div>
                </div>
            </div>

            <div class="grid-2-col-resp gap-6">
                {/* Participant Management */}
                <Panel title="Participants" icon={GROUP_SVG} action={
                    <div class="flex align-center gap-2">
                        <input
                            type="text"
                            placeholder="Filter..."
                            class="modern-input small mb-0 attendee-filter-input"
                            value={attendeeFilter()}
                            onInput={(e) => { setAttendeeFilter(e.currentTarget.value); setAttendeePage(1); }}
                        />
                        <Show when={!props.costsReleased}>
                            <button class="small-btn primary mini-btn" onClick={() => setShowAddAttendee(true)}>
                                <span innerHTML={ADD_SVG} /> Add
                            </button>
                        </Show>
                    </div>
                }>
                    <div class="glass-table-container">
                        <PaginationSlider
                            currentPage={attendeePage()}
                            oldContent={<AttendeeTable list={oldAttendees() || []} />}
                        >
                            <AttendeeTable list={displayAttendees()} />
                        </PaginationSlider>
                    </div>
                    <Pagination currentPage={attendeePage()} totalPages={totalAttendeePages()} onPageChange={setAttendeePage} />
                </Panel>

                <div class="flex-column gap-6">
                    {/* Transport Panel */}
                    <Show when={props.isOffsite}>
                        <Panel title="Trips & Transport" icon={TRIP_SVG} action={
                            <Show when={!props.costsReleased}>
                                <button class="small-btn primary mini-btn" onClick={() => setShowAddTrip(true)}>
                                    <span innerHTML={ADD_SVG} /> New Trip
                                </button>
                            </Show>
                        }>
                            <div class="flex-column gap-3">
                                <For each={trips()}>
                                    {trip => {
                                        const tripDrivers = createMemo(() => drivers()?.filter(d => d.trip_id === trip.id) || []);
                                        const totalSeats = createMemo(() => tripDrivers().filter(d => d.status === 'accepted').reduce((sum, d) => sum + d.seats, 0));
                                        const totalBoats = createMemo(() => tripDrivers().filter(d => d.status === 'accepted').reduce((sum, d) => sum + d.boats, 0));

                                        return (
                                            <div class="liquid-container p-3 flex-between align-center secondary-bg">
                                                <div class="trip-info">
                                                    <div class="font-bold">{trip.name}</div>
                                                    <div class="small-text text-muted">{totalSeats()} Seats / {totalBoats()} Boats</div>
                                                </div>
                                                <div class="flex gap-2">
                                                    <button class="small-btn secondary outline mini-btn" onClick={() => setManageDriversTripId(trip.id)}>{!props.costsReleased ? 'Drivers' : 'View'} ({tripDrivers().length})</button>
                                                    <Show when={!props.costsReleased}>
                                                        <button class="small-btn secondary outline mini-btn" onClick={() => setExclusionsData({ type: 'trip', id: trip.id })}>Exclusions</button>
                                                    </Show>
                                                </div>
                                            </div>
                                        );
                                    }}
                                </For>
                                <Show when={trips()?.length === 0}>
                                    <p class="muted-text text-center py-4">No trips defined.</p>
                                </Show>
                            </div>
                        </Panel>
                    </Show>

                    {/* Expenses Panel */}
                    <Panel title="Event Expenses" icon={WALLET_SVG} action={
                        <Show when={!props.costsReleased}>
                            <button class="small-btn primary mini-btn" onClick={() => setShowAddExpense(true)}>
                                <span innerHTML={ADD_SVG} /> New Expense
                            </button>
                        </Show>
                    }>
                        <div class="flex-column gap-3">
                            <For each={expenses()}>
                                {e => (
                                    <div class="liquid-container p-3 flex-between align-center secondary-bg">
                                        <div class="expense-info">
                                            <div class="font-bold">£{e.amount.toFixed(2)}</div>
                                            <div class="small-text text-muted">{e.first_name}: {e.description}</div>
                                        </div>
                                        <Show when={!props.costsReleased}>
                                            <button class="small-btn secondary outline mini-btn" onClick={() => setExclusionsData({ type: 'expense', id: e.id })}>Exclusions</button>
                                        </Show>
                                    </div>
                                )}
                            </For>
                            <Show when={expenses()?.length === 0}>
                                <p class="muted-text text-center py-4">No expenses reported.</p>
                            </Show>
                        </div>
                    </Panel>
                </div>
            </div>

            {/* Summary Matrix */}
            <Show when={(summary()?.breakdown.length || 0) > 0}>
                <Panel title="Financial Settlement" icon={CURRENCY_POUND_SVG}>
                    <div class="glass-table-container">
                        <div class="table-responsive">
                            <table class="glass-table matrix-table">
                                <thead>
                                    <tr>
                                        <th>Member</th>
                                        <th class="text-right">Contributed</th>
                                        <th class="text-right">Share</th>
                                        <th class="text-right">Net Change</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <For each={summary()?.breakdown}>
                                        {row => (
                                            <tr><td class="primary-text">{row.name}</td>
                                                <td class="amount text-right">£{(row.spent + row.mileage).toFixed(2)}</td>
                                                <td class="amount text-right">-£{row.shared_cost_share.toFixed(2)}</td>
                                                <td class="amount text-right" classList={{ 'text-success': row.net >= 0, 'text-error': row.net < 0 }}>
                                                    {row.net >= 0 ? '+' : ''}£{row.net.toFixed(2)}
                                                </td>
                                            </tr>
                                        )}
                                    </For>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Panel>
            </Show>

            {/* Modals Implementation */}
            <Modal isOpen={showAddAttendee()} onClose={() => setShowAddAttendee(false)} title="Add Participant">
                <AttendeeSearch eventId={props.eventId} onAdded={() => { setShowAddAttendee(false); refreshAll(); }} />
            </Modal>

            <Modal isOpen={showAddTrip()} onClose={() => setShowAddTrip(false)} title="New Trip">
                <form class="modern-form" onSubmit={async (e) => {
                    e.preventDefault();
                    const name = (e.currentTarget.querySelector('input') as HTMLInputElement).value;
                    try {
                        await apiRequest('POST', `/api/admin/events/${props.eventId}/trips`, { name });
                        notify('Success', 'Trip created.', 'success');
                        setShowAddTrip(false); refreshAll();
                    } catch (err: any) { notify('Error', err.message, 'error'); }
                }}>
                    <label>Trip Name <input type="text" placeholder="e.g. Drive to Lake" required /></label>
                    <button type="submit" class="primary full-width">Create Trip</button>
                </form>
            </Modal>
        </div>
    );
}

function AttendeeSearch(props: { eventId: number, onAdded: () => void }) {
    const [query, setQuery] = createSignal('');
    const [results] = createResource(query, async (q) => {
        if (q.length < 2) return [];
        const res = await apiRequest('GET', `/api/admin/users?search=${encodeURIComponent(q)}&limit=5`);
        return res.users || [];
    });

    const handleAdd = async (u: any) => {
        const ok = await showConfirmModal('Add Participant', `Add <strong>${u.first_name} ${u.last_name}</strong> to the event?`);
        if (!ok) return;
        try {
            await apiRequest('POST', `/api/admin/events/${props.eventId}/attendees`, { userId: u.id });
            props.onAdded();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    return (
        <div class="modern-form">
            <div class="form-group">
                <label>Search Member</label>
                <input type="text" placeholder="Type name or email..." class="modern-input" onInput={e => setQuery(e.currentTarget.value)} />
                <Show when={results().length > 0}>
                    <div class="liquid-container item-list-scroll-small">
                        <For each={results()}>
                            {u => (
                                <div class="search-result-item" onClick={() => handleAdd(u)}>
                                    <Avatar user={u} classes="mini" />
                                    <div>
                                        <strong>{u.first_name} {u.last_name}</strong><br />
                                        <small class="muted-text">{u.email}</small>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </Show>
            </div>
        </div>
    );
}
import { createSignal, createResource, For, Show, createMemo, createEffect } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { 
    CURRENCY_POUND_SVG, ADD_SVG, TRIP_SVG, CHECK_SVG, 
    CLOSE_SVG, EDIT_SVG, GROUP_SVG, WALLET_SVG, DELETE_SVG 
} from '@/utils/icons';
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";
import PaginationSlider from "@/components/PaginationSlider";
import LiquidContainer from "@/components/LiquidContainer";

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
        if (!confirm('Remove participant?')) return;
        try {
            await apiRequest('DELETE', `/api/admin/events/${props.eventId}/attendees/${id}`);
            notify('Success', 'Removed.', 'success');
            refreshAll();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    const handleRefundUpfront = async (id: number) => {
        if (!confirm('Refund upfront fee?')) return;
        try {
            await apiRequest('POST', `/api/admin/events/${props.eventId}/attendees/${id}/refund-upfront`);
            notify('Success', 'Refunded.', 'success');
            refreshAll();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    const handleReleaseCosts = async () => {
        if (!confirm('Finalize the budget and update all member balances? This cannot be undone.')) return;
        try {
            await apiRequest('POST', `/api/admin/events/${props.eventId}/release-costs`);
            notify('Success', 'Funds released successfully.', 'success');
            // We might need to notify parent to refresh event object if costs_released changed
            window.location.reload(); // Quick way to refresh everything including parent Layout
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    const AttendeeTable = (innerProps: { list: Attendee[] }) => (
        <table class="glass-table">
            <thead>
                <tr><th>Attendee</th><th>Status</th><th class="text-right">Action</th></tr>
            </thead>
            <tbody>
                <For each={innerProps.list}>
                    {a => (
                        <tr>
                            <td class="primary-text">
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
        <div class="finance-management-layout">
            {/* Participant Management */}
            <div class="panel mb-6">
                <div class="panel-header">
                    <h3><span innerHTML={GROUP_SVG} /> Participant Management</h3>
                    <div class="panel-actions">
                        <input 
                            type="text" 
                            placeholder="Filter list..." 
                            class="modern-input small" 
                            style="margin-bottom: 0; width: 180px;" 
                            value={attendeeFilter()}
                            onInput={(e) => { setAttendeeFilter(e.currentTarget.value); setAttendeePage(1); }}
                        />
                        <Show when={!props.costsReleased}>
                            <button class="small-btn primary mini-btn" onClick={() => setShowAddAttendee(true)}>
                                <span innerHTML={ADD_SVG} /> Add
                            </button>
                        </Show>
                    </div>
                </div>
                <div class="panel-content">
                    <div class="glass-table-container">
                        <PaginationSlider 
                            currentPage={attendeePage()} 
                            oldContent={<AttendeeTable list={oldAttendees() || []} />}
                        >
                            <AttendeeTable list={displayAttendees()} />
                        </PaginationSlider>
                    </div>
                    <Pagination currentPage={attendeePage()} totalPages={totalAttendeePages()} onPageChange={setAttendeePage} />
                </div>
            </div>

            {/* Transport Panel */}
            <Show when={props.isOffsite}>
                <div class="panel mb-6">
                    <div class="panel-header">
                        <h3><span innerHTML={TRIP_SVG} /> Trips & Transport</h3>
                        <div class="panel-actions">
                            <Show when={!props.costsReleased}>
                                <button class="small-btn primary mini-btn" onClick={() => setShowAddTrip(true)}>
                                    <span innerHTML={ADD_SVG} /> New Trip
                                </button>
                            </Show>
                        </div>
                    </div>
                    <div class="panel-content">
                        <div class="finance-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
                            <For each={trips()}>
                                {trip => {
                                    const tripDrivers = createMemo(() => drivers()?.filter(d => d.trip_id === trip.id) || []);
                                    const totalSeats = createMemo(() => tripDrivers().filter(d => d.status === 'accepted').reduce((sum, d) => sum + d.seats, 0));
                                    const totalBoats = createMemo(() => tripDrivers().filter(d => d.status === 'accepted').reduce((sum, d) => sum + d.boats, 0));

                                    return (
                                        <LiquidContainer class="trip-admin-card secondary-bg" padding="1.25rem">
                                            <div class="trip-info"><strong>{trip.name}</strong><br /><small>{totalSeats()} Seats / {totalBoats()} Boats</small></div>
                                            <div class="trip-actions mt-4">
                                                <button class="small-btn secondary full-width mb-2" onClick={() => setManageDriversTripId(trip.id)}>{!props.costsReleased ? 'Drivers' : 'View Drivers'} ({tripDrivers().length})</button>
                                                <Show when={!props.costsReleased}>
                                                    <button class="small-btn outline full-width" onClick={() => setExclusionsData({ type: 'trip', id: trip.id })}>Exclusions</button>
                                                </Show>
                                            </div>
                                        </LiquidContainer>
                                    );
                                }}
                            </For>
                            <Show when={trips()?.length === 0}>
                                <p class="muted-text">No trips defined.</p>
                            </Show>
                        </div>
                    </div>
                </div>
            </Show>

            {/* Expenses Panel */}
            <div class="panel mb-6">
                <div class="panel-header">
                    <h3><span innerHTML={WALLET_SVG} /> Event Expenses</h3>
                    <div class="panel-actions">
                        <Show when={!props.costsReleased}>
                            <button class="small-btn primary mini-btn" onClick={() => setShowAddExpense(true)}>
                                <span innerHTML={ADD_SVG} /> New Expense
                            </button>
                        </Show>
                    </div>
                </div>
                <div class="panel-content">
                    <div class="finance-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
                        <For each={expenses()}>
                            {e => (
                                <LiquidContainer class="expense-admin-card secondary-bg" padding="1.25rem">
                                    <div class="expense-info"><strong>£{e.amount.toFixed(2)}</strong> - {e.first_name}<p class="desc small-text mt-1">{e.description}</p></div>
                                    <Show when={!props.costsReleased}>
                                        <div class="expense-actions mt-4">
                                            <button class="small-btn outline full-width" onClick={() => setExclusionsData({ type: 'expense', id: e.id })}>Exclusions</button>
                                        </div>
                                    </Show>
                                </LiquidContainer>
                            )}
                        </For>
                        <Show when={expenses()?.length === 0}>
                            <p class="muted-text">No expenses reported.</p>
                        </Show>
                    </div>
                </div>
            </div>

            {/* Summary Matrix */}
            <Show when={(summary()?.breakdown.length || 0) > 0}>
                <div class="panel">
                    <div class="panel-header">
                        <h3><span innerHTML={CURRENCY_POUND_SVG} /> Financial Settlement</h3>
                    </div>
                    <div class="panel-content">
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
                                                <tr>
                                                    <td class="primary-text">{row.name}</td>
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
                        <div class="summary-footer-actions mt-6 flex justify-end">
                            <div class="button-group" style="gap: 1rem;">
                                <button class="secondary outline" onClick={() => {
                                    // Simplified CSV logic for now or port full logic
                                    notify('Info', 'CSV export not implemented in this demo port yet.', 'info');
                                }}>Download CSV</button>
                                <button class="primary" disabled={props.costsReleased} onClick={handleReleaseCosts}>
                                    {props.costsReleased ? 'Funds Released' : 'Release Funds'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
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
        if (!confirm(`Add ${u.first_name} ${u.last_name} to the event?`)) return;
        try {
            await apiRequest('POST', `/api/admin/events/${props.eventId}/attendees`, { userId: u.id });
            props.onAdded();
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div class="modern-form">
            <div class="form-group">
                <label>Search Member</label>
                <input type="text" placeholder="Type name or email..." class="modern-input" onInput={e => setQuery(e.currentTarget.value)} />
                <Show when={results().length > 0}>
                    <LiquidContainer class="mt-2 item-list-scroll-small" padding="0px">
                        <For each={results()}>
                            {u => (
                                <div class="search-result-item" onClick={() => handleAdd(u)} style="padding: 0.75rem; cursor: pointer; border-bottom: 1px solid rgba(128,128,128,0.1); display: flex; align-items: center; gap: 0.75rem;">
                                    <Avatar user={u} classes="mini" />
                                    <div>
                                        <strong>{u.first_name} {u.last_name}</strong><br />
                                        <small class="muted-text">{u.email}</small>
                                    </div>
                                </div>
                            )}
                        </For>
                    </LiquidContainer>
                </Show>
            </div>
        </div>
    );
}
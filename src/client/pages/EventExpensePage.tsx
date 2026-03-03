// todo clean up
import { createSignal, createResource, Show, onMount, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
import { useParams, useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { FaSolidPoundSign, FaSolidFloppyDisk, FaSolidXmark } from "solid-icons/fa";
import { incrementModals, decrementModals } from "@/utils/modal-state";

export default function EventExpensePage() {
    const params = useParams();
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const eventId = () => params.id;
    const expenseId = () => params.expenseId;

    onMount(() => {
        incrementModals();
        onCleanup(() => {
            decrementModals();
        });
    });

    const [expense] = createResource(async () => {
        if (expenseId() === 'new') return { description: '', amount: 0 };
        try {
            const res = await apiRequest('GET', `/api/events/${eventId()}/expenses/${expenseId()}`);
            return res.expense;
        } catch (e) {
            return { description: '', amount: 0 };
        }
    });

    const handleSave = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = {
            description: formData.get('description'),
            amount: parseFloat(formData.get('amount') as string)
        };

        try {
            if (expenseId() === 'new') {
                await apiRequest('POST', `/api/events/${eventId()}/expenses`, data);
                notify('Success', 'Expense reported.', 'success');
            } else {
                await apiRequest('PUT', `/api/events/${eventId()}/expenses/${expenseId()}`, data);
                notify('Success', 'Expense updated.', 'success');
            }
            navigate(`/event/${eventId()}`);
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    const handleBackdropClick = (e: MouseEvent) => {
        if (e.target === e.currentTarget) {
            navigate(-1);
        }
    };

    return (
        <Portal>
            <div id="event-expense-view" class="view c-modal-overlay visible" onClick={handleBackdropClick}>
                <div class="c-modal-content">
                    <button class="c-modal-close-btn" onClick={() => navigate(-1)}><FaSolidXmark /></button>
                    <div class="c-modal-body">
                        <h1>{expenseId() === 'new' ? 'Report Expense' : 'Edit Expense'}</h1>
                        <Show when={expense()} fallback={<p>Loading...</p>}>
                            {(e) => (
                                <form onSubmit={handleSave} class="modern-form">
                                    <div class="form-group">
                                        <label class="small-title">Description</label>
                                        <input name="description" type="text" value={e().description} placeholder="e.g. Fuel, Parking" required />
                                    </div>
                                    <div class="form-group">
                                        <label class="small-title">Amount (£)</label>
                                        <input name="amount" type="number" step="0.01" value={e().amount} placeholder="0.00" required />
                                    </div>
                                    <button type="submit" class="primary full-width">
                                        <FaSolidFloppyDisk /> Save Expense
                                    </button>
                                </form>
                            )}
                        </Show>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
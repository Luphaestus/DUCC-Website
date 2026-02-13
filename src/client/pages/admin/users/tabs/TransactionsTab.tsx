import { createSignal, createResource, For, Show, onMount, onCleanup } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { WALLET_SVG, ADD_SVG, REMOVE_SVG, EDIT_SVG, SAVE_SVG, CLOSE_SVG, DELETE_SVG, CHECK_SVG, SETTINGS_SVG } from '@/utils/icons';
import Panel from "@/components/Panel";
import Modal from "@/components/Modal";
import { onUpdate } from "@/utils/updates";
import { showConfirmModal } from "@/utils/modal";

interface Transaction {
    id: number;
    description: string;
    amount: number;
    after: number;
    status: 'completed' | 'pending';
    created_at: string;
}

export default function TransactionsTab(props: { userId: number }) {
    const { notify } = useNotifications();
    const [editingId, setEditingId] = createSignal<number | null>(null);

    // Manage Pending Modal State
    const [managePendingId, setManagePendingId] = createSignal<number | null>(null);
    const [pendingAmount, setPendingAmount] = createSignal("");
    const [pendingDesc, setPendingDesc] = createSignal("");
    const [isManaging, setIsManaging] = createSignal(false);

    onMount(() => {
        const cleanup = onUpdate((event) => {
            if ((event.type === 'admin_transaction_update' || event.type === 'balance_update') && Number(event.data.userId) === Number(props.userId)) {
                refetch();
            }
        });
        onCleanup(cleanup);
    });

    const [data, { refetch }] = createResource(
        () => props.userId,
        async (id) => {
            if (!id || isNaN(id)) {
                return { transactions: [], minMoney: -25 };
            }
            const [transactionsRaw, globalData] = await Promise.all([
                apiRequest('GET', `/api/admin/user/${id}/transactions`),
                apiRequest('GET', '/api/globals/MinMoney').catch(() => ({ res: { MinMoney: { data: -25 } } }))
            ]);
            return {
                transactions: (transactionsRaw || []) as Transaction[],
                minMoney: Number(globalData.res?.MinMoney?.data || -25)
            };
        }
    );

    const currentBalance = () => data()?.transactions.filter(t => t.status === 'completed')[0]?.after || 0;
    const balanceClass = () => {
        const bal = currentBalance();
        const min = data()?.minMoney || -25;
        if (bal < min) return 'negative';
        if (bal >= 0) return 'positive';
        return 'warning';
    };

    const handleAdd = async (e: Event) => {
        e.preventDefault();
        if (!props.userId) return;
        const form = e.target as HTMLFormElement;
        const amount = (form.querySelector('[name="amount"]') as HTMLInputElement).value;
        const description = (form.querySelector('[name="description"]') as HTMLInputElement).value;
        try {
            await apiRequest('POST', `/api/admin/user/${props.userId}/transaction`, { amount, description });
            notify('Success', 'Transaction added', 'success');
            refetch();
            form.reset();
        } catch (e) { notify('Error', 'Failed to add', 'error'); }
    };

    const handleDelete = async (id: number) => {
        if (!await showConfirmModal('Delete Transaction?', 'Are you sure you want to permanently delete this transaction?')) return;
        try {
            await apiRequest('DELETE', `/api/admin/transaction/${id}`);
            notify('Success', 'Transaction deleted', 'success');
            refetch();
        } catch (e) { notify('Error', 'Failed to delete', 'error'); }
    };

    const handleSaveEdit = async (id: number, el: HTMLElement) => {
        const amount = (el.querySelector('.tx-amount-input') as HTMLInputElement).value;
        const description = (el.querySelector('.tx-desc-input') as HTMLInputElement).value;
        try {
            await apiRequest('PUT', `/api/admin/transaction/${id}`, { amount, description });
            notify('Success', 'Transaction updated', 'success');
            setEditingId(null);
            refetch();
        } catch (e) { notify('Error', 'Update failed', 'error'); }
    };

    const handleConfirm = async (id: number) => {
        if (!await showConfirmModal('Confirm Top-Up?', 'Has this bank transfer been received? The user balance will be updated.')) return;
        try {
            await apiRequest('POST', `/api/admin/transaction/${id}/confirm`);
            notify('Success', 'Payment confirmed', 'success');
            refetch();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    const openManageModal = (tx: Transaction) => {
        setManagePendingId(tx.id);
        setPendingAmount(tx.amount.toString());
        setPendingDesc(tx.description);
        setIsManaging(true);
    };

    const handleManageConfirm = async (e: Event) => {
        e.preventDefault();
        const id = managePendingId();
        if (!id) return;
        try {
            await apiRequest('POST', `/api/admin/transaction/${id}/confirm`, {
                amount: parseFloat(pendingAmount()),
                description: pendingDesc()
            });
            notify('Success', 'Payment confirmed and user notified', 'success');
            setIsManaging(false);
            refetch();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    const handleManageDiscard = async () => {
        const id = managePendingId();
        if (!id || !await showConfirmModal('Discard Request?', 'Are you sure you want to discard this top-up request? An email notification will be sent to the user.')) return;
        try {
            await apiRequest('DELETE', `/api/admin/transaction/${id}`);
            notify('Success', 'Request discarded', 'success');
            setIsManaging(false);
            refetch();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    const handleSetDebtLimit = async (e: Event) => {
        e.preventDefault();
        if (!props.userId) return;
        const form = e.target as HTMLFormElement;
        const debt_limit = (form.querySelector('[name="debt_limit"]') as HTMLInputElement).value;
        const debt_limit_expires_at = (form.querySelector('[name="debt_limit_expires_at"]') as HTMLInputElement).value;
        try {
            await apiRequest('POST', `/api/admin/user/${props.userId}/elements`, {
                debt_limit,
                debt_limit_expires_at: debt_limit_expires_at || null
            });
            notify('Success', 'Payment plan updated', 'success');
            // We might need to refetch the user profile if it was showing debt limit info,
            // but for now we just show a success message.
        } catch (e) { notify('Error', 'Failed to update payment plan', 'error'); }
    };

    return (
        <div class="transactions-tab-wrapper">
            <div class="value-header">
                <span class="value-title">Account Balance</span>
                <span class={`value-amount ${balanceClass()}`}>£{currentBalance().toFixed(2)}</span>
            </div>

            <Panel title="Payment Plan (Temporary Debt Limit)" icon={EDIT_SVG} class="mb-4">
                <div class="liquid-container">
                    <p style="font-size: 0.8rem; margin-bottom: 1.25rem; opacity: 0.6; line-height: 1.4;">
                        Setting a debt limit allows this user to continue joining events even with a negative balance, up to the specified amount.
                    </p>
                    <form style="display: flex; flex-direction: column; gap: 1rem; width: 100%;" onSubmit={handleSetDebtLimit}>
                        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                            <label style="font-size: 0.8rem; opacity: 0.8;">Limit (£)</label>
                            <input name="debt_limit" type="number" step="0.01" placeholder="e.g. 50.00" class="compact-input" required />
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                            <label style="font-size: 0.8rem; opacity: 0.8;">Expiry Date (Optional)</label>
                            <input name="debt_limit_expires_at" type="datetime-local" class="compact-input" />
                        </div>
                        <button type="submit" class="small-btn icon-text-btn full-width"><span innerHTML={SAVE_SVG} /> Update Plan</button>
                    </form>
                </div>
            </Panel>

            <Panel title="Transaction History" icon={WALLET_SVG}>
                <div class="liquid-container transaction-item new-entry-row">
                    <form class="tx-edit-grid" onSubmit={handleAdd}>
                        <input name="description" type="text" placeholder="Description (e.g. Top Up)" class="compact-input" required />
                        <input name="amount" type="number" step="0.01" placeholder="Amount" class="compact-input" required />
                        <button type="submit" class="small-btn icon-text-btn min-w-100"><span innerHTML={ADD_SVG} /> Add</button>
                    </form>
                </div>

                <div id="admin-tx-list" class="mt-4">
                    <For each={data()?.transactions}>
                        {tx => {
                            const isNegative = tx.amount < 0;
                            const dateStr = new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                            const isEditing = () => editingId() === tx.id;

                            return (
                                <div class="liquid-container transaction-item item-list-row" classList={{ editing: isEditing(), 'pending-row': tx.status === 'pending' }}>
                                    <div class="item-icon" classList={{ negative: isNegative, positive: !isNegative, pending: tx.status === 'pending' }} innerHTML={tx.status === 'pending' ? '<span style="font-size: 1.2rem; font-weight: bold;">?</span>' : (isNegative ? REMOVE_SVG : ADD_SVG)} />

                                    <Show when={!isEditing()} fallback={
                                        <div class="tx-edit-grid no-btn" ref={el => { }}>
                                            <input class="tx-desc-input compact-input" value={tx.description} />
                                            <input type="number" step="0.01" class="tx-amount-input compact-input" value={tx.amount} />
                                        </div>
                                    }>
                                        <div class="item-details">
                                            <span class="item-title">
                                                {tx.description}
                                                <Show when={tx.status === 'pending'}>
                                                    <span class="badge warning mini-badge ml-2">PENDING</span>
                                                </Show>
                                            </span>
                                            <span class="item-subtitle">{dateStr}</span>
                                        </div>
                                        <div class="item-value-group">
                                            <div class="amount-line">
                                                <span class="item-value" classList={{ positive: !isNegative && tx.status !== 'pending', negative: isNegative, muted: tx.status === 'pending' }}>
                                                    {isNegative ? '' : '+'}{tx.amount.toFixed(2)}
                                                </span>
                                            </div>
                                            <Show when={tx.status === 'completed'}>
                                                <div class="balance-line">
                                                    <span class="item-extra">£{tx.after.toFixed(2)}</span>
                                                </div>
                                            </Show>
                                        </div>
                                    </Show>

                                    <div class="item-actions">
                                        <Show when={!isEditing()}>
                                            <Show when={tx.status === 'pending'}>
                                                <button class="icon-btn success mr-2" onClick={() => handleConfirm(tx.id)} title="Quick Confirm" innerHTML={CHECK_SVG} />
                                                <button class="small-btn secondary mini-btn mr-2" onClick={() => openManageModal(tx)}><span innerHTML={SETTINGS_SVG} /> Manage</button>
                                            </Show>
                                            <Show when={tx.status === 'completed'}>
                                                <button class="icon-btn edit-tx-btn" onClick={() => setEditingId(tx.id)} title="Edit" innerHTML={EDIT_SVG} />
                                                <button class="icon-btn delete-tx-btn delete" onClick={() => handleDelete(tx.id)} title="Delete" innerHTML={DELETE_SVG} />
                                            </Show>
                                        </Show>
                                        <Show when={isEditing()}>
                                            <button class="icon-btn save-tx-btn success" onClick={(e) => handleSaveEdit(tx.id, (e.currentTarget.parentElement?.parentElement as HTMLElement))} title="Save" innerHTML={SAVE_SVG} />
                                            <button class="icon-btn cancel-tx-btn warning" onClick={() => setEditingId(null)} title="Cancel" innerHTML={CLOSE_SVG} />
                                        </Show>
                                    </div>
                                </div>
                            );
                        }}
                    </For>
                </div>
            </Panel>

            <Modal isOpen={isManaging()} onClose={() => setIsManaging(false)} title="Manage Top-Up Request">
                <form class="modern-form" onSubmit={handleManageConfirm}>
                    <p>Review and verify the reported bank transfer.</p>

                    <div class="form-group">
                        <label>Amount Received (£)
                            <input
                                type="number"
                                step="0.01"
                                value={pendingAmount()}
                                onInput={e => setPendingAmount(e.currentTarget.value)}
                                required
                            />
                        </label>
                    </div>

                    <div class="form-group">
                        <label>Description
                            <input
                                type="text"
                                value={pendingDesc()}
                                onInput={e => setPendingDesc(e.currentTarget.value)}
                                required
                            />
                        </label>
                    </div>

                    <div class="liquid-container warning-bg" style={{ "font-size": "0.85rem" }}>
                        <p class="m-0"><strong>Email Notification:</strong> Confirming or discarding this request will automatically email the user with the details.</p>
                    </div>

                    <div class="form-actions" style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <button type="submit" class="primary full-width">
                            <span innerHTML={CHECK_SVG} /> Confirm & Notify User
                        </button>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                            <button type="button" class="secondary outline" onClick={() => setIsManaging(false)}>Cancel</button>
                            <button type="button" class="delete outline" onClick={handleManageDiscard}>Discard Request</button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div >
    );
}

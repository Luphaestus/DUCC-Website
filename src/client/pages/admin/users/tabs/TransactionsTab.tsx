// todo clean up
import { createSignal, createResource, For, Show, onMount, onCleanup } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { WALLET_SVG, ADD_SVG, REMOVE_SVG, EDIT_SVG, SAVE_SVG, CLOSE_SVG, DELETE_SVG } from '@/utils/icons';
import Panel from "@/components/Panel";
import { onUpdate } from "@/utils/updates";

interface Transaction {
    id: number;
    description: string;
    amount: number;
    after: number;
    created_at: string;
}

export default function TransactionsTab(props: { userId: number }) {
    const { notify } = useNotifications();
    const [editingId, setEditingId] = createSignal<number | null>(null);

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
                transactions: ((transactionsRaw || []) as Transaction[]).reverse(),
                minMoney: Number(globalData.res?.MinMoney?.data || -25)
            };
        }
    );

    const currentBalance = () => data()?.transactions[0]?.after || 0;
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
        if (!confirm('Delete transaction?')) return;
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
                <div class="liquid-container transaction-item" style={{ "--liquid-padding": "1.25rem" }}>
                    <form class="tx-edit-grid" onSubmit={handleSetDebtLimit}>
                        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                            <label style="font-size: 0.8rem; opacity: 0.8;">Limit (£)</label>
                            <input name="debt_limit" type="number" step="0.01" placeholder="e.g. 50.00" class="compact-input" required />
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                            <label style="font-size: 0.8rem; opacity: 0.8;">Expiry Date (Optional)</label>
                            <input name="debt_limit_expires_at" type="datetime-local" class="compact-input" />
                        </div>
                        <div style="display: flex; align-items: flex-end;">
                            <button type="submit" class="small-btn icon-text-btn min-w-100"><span innerHTML={SAVE_SVG} /> Update Plan</button>
                        </div>
                    </form>
                    <p style="font-size: 0.8rem; margin-top: 0.5rem; opacity: 0.6;">
                        Setting a debt limit allows this user to continue joining events even with a negative balance, up to the specified amount.
                    </p>
                </div>
            </Panel>

            <Panel title="Transaction History" icon={WALLET_SVG}>
                <div class="liquid-container transaction-item new-entry-row" style={{ "--liquid-padding": "1.25rem" }}>
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
                                <div class="liquid-container transaction-item item-list-row" classList={{ editing: isEditing() }} style={{ "--liquid-padding": "1.25rem" }}>
                                    <div class="item-icon" classList={{ negative: isNegative, positive: !isNegative }} innerHTML={isNegative ? REMOVE_SVG : ADD_SVG} />
                                    
                                    <Show when={!isEditing()} fallback={
                                        <div class="tx-edit-grid no-btn" ref={el => {}}>
                                            <input class="tx-desc-input compact-input" value={tx.description} />
                                            <input type="number" step="0.01" class="tx-amount-input compact-input" value={tx.amount} />
                                        </div>
                                    }>
                                        <div class="item-details">
                                            <span class="item-title">{tx.description}</span>
                                            <span class="item-subtitle">{dateStr}</span>
                                        </div>
                                        <div class="item-value-group">
                                            <div class="amount-line">
                                                <span class="item-value" classList={{ positive: !isNegative, negative: isNegative }}>
                                                    {isNegative ? '' : '+'}{tx.amount.toFixed(2)}
                                                </span>
                                            </div>
                                            <div class="balance-line">
                                                <span class="item-extra">£{tx.after.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </Show>

                                    <div class="item-actions">
                                        <Show when={!isEditing()}>
                                            <button class="icon-btn edit-tx-btn" onClick={() => setEditingId(tx.id)} title="Edit" innerHTML={EDIT_SVG} />
                                            <button class="icon-btn delete-tx-btn delete" onClick={() => handleDelete(tx.id)} title="Delete" innerHTML={DELETE_SVG} />
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
        </div>
    );
}

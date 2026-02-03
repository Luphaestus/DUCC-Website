/**
 * transactions.js (Admin User Tab)
 * 
 * Renders the "Transactions" tab within the administrative user management view.
 */

import { apiRequest } from '@/utils/api';
import { notify } from '@/components/notification';
import { showConfirmModal } from '@/utils/modal';
import { setupNumberInput } from '@/utils/utils';
import { Panel } from '@/widgets/panel';
import { ItemList, StandardListItem } from '@/widgets/item_list';
import { ValueHeader, updateValueDisplay } from '@/widgets/value_header';
import { WALLET_SVG, ADD_SVG, REMOVE_SVG, EDIT_SVG, SAVE_SVG, CLOSE_SVG, DELETE_SVG } from '@/utils/icons';
import { BalanceChangedEvent } from '@/utils/events/events';

/**
 * Main rendering and logic binding function for the Admin Transactions tab.
 * 
 * @param {HTMLElement} container - Tab content area.
 * @param {number|string} userId - ID of the user whose finances are being managed.
 */
export async function renderTransactionsTab(container: HTMLElement, userId: number | string): Promise<void> {
    container.innerHTML = '<p class="loading-text">Loading transactions...</p>';
    try {
        const [transactionsRaw, globalData] = await Promise.all([
            apiRequest('GET', `/api/admin/user/${userId}/transactions`),
            apiRequest('GET', '/api/globals/MinMoney').catch(() => ({ res: { MinMoney: { data: -25 } } }))
        ]);

        const transactions: any[] = (transactionsRaw || []).reverse(); // Newest first
        const minMoney = Number(globalData.res?.MinMoney?.data || -25);
        
        const currentBalance = transactions.length > 0 ? transactions[0].after : 0;
        
        let balClass = 'warning';
        if (currentBalance < minMoney) balClass = 'negative';
        else if (currentBalance >= 0) balClass = 'positive';

        container.innerHTML = `
            <div class="transactions-tab-wrapper">
                ${ValueHeader({
                    title: 'Account Balance',
                    value: `£${currentBalance.toFixed(2)}`,
                    valueId: 'balance-amount',
                    valueClass: balClass
                })}

                ${Panel({
                    title: 'Transaction History',
                    icon: WALLET_SVG,
                    content: `
                        <div class="card-body">
                            <div class="transaction-item glass-panel new-entry-row">
                                <div class="tx-edit-grid">
                                    <input id="new-tx-desc" type="text" placeholder="Description (e.g. Top Up)" class="compact-input">
                                    <input id="new-tx-amount" type="number" step="0.01" placeholder="Amount" class="compact-input">
                                    <button id="add-tx-btn" class="small-btn icon-text-btn min-w-100">${ADD_SVG} Add</button>
                                </div>
                            </div>

                            <div id="admin-tx-list">
                                ${ItemList(transactions, tx => {
                                    const isNegative = tx.amount < 0;
                                    const icon = isNegative ? REMOVE_SVG : ADD_SVG;
                                    const iconClass = isNegative ? 'negative' : 'positive';
                                    const dateStr = new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

                                    return StandardListItem({
                                        classes: 'transaction-item',
                                        dataAttributes: `data-id="${tx.id}"`,
                                        icon: icon,
                                        iconClass: iconClass,
                                        title: tx.description,
                                        subtitle: dateStr,
                                        value: `${isNegative ? '' : '+'}${tx.amount.toFixed(2)}`,
                                        valueClass: iconClass,
                                        extra: `£${tx.after !== undefined ? tx.after.toFixed(2) : 'N/A'}`,
                                        content: `
                                            <div class="tx-edit-grid no-btn hidden">
                                                <input class="tx-desc-input compact-input" value="${tx.description}">
                                                <input type="number" step="0.01" class="tx-amount-input compact-input" value="${tx.amount}">
                                            </div>
                                        `,
                                        actions: `
                                            <button class="icon-btn edit-tx-btn" data-id="${tx.id}" title="Edit">${EDIT_SVG}</button>
                                            <button class="icon-btn save-tx-btn hidden success" data-id="${tx.id}" title="Save">${SAVE_SVG}</button>
                                            <button class="icon-btn cancel-tx-btn hidden warning" data-id="${tx.id}" title="Cancel">${CLOSE_SVG}</button>
                                            <button class="icon-btn delete-tx-btn delete" data-id="${tx.id}" title="Delete">${DELETE_SVG}</button>
                                        `
                                    });
                                })}
                            </div>
                        </div>
                    `
                })}
            </div>
        `;

        container.querySelectorAll('input[type="number"]').forEach(el => setupNumberInput(el as HTMLInputElement));

        // --- Logic Binding ---

        // Add New Transaction Handler
        const addBtn = document.getElementById('add-tx-btn');
        if (addBtn) {
            addBtn.onclick = async () => {
                const amount = (document.getElementById('new-tx-amount') as HTMLInputElement).value;
                const description = (document.getElementById('new-tx-desc') as HTMLInputElement).value;
                if (!amount || !description) return notify('Error', 'Please fill all fields', 'error');

                try {
                    await apiRequest('POST', `/api/admin/user/${userId}/transaction`, { amount, description });
                    BalanceChangedEvent.notify();
                    notify('Success', 'Transaction added', 'success');
                    renderTransactionsTab(container, userId);
                } catch (e) {
                    notify('Error', 'Failed to add', 'error');
                }
            };
        }

        container.querySelectorAll('.delete-tx-btn').forEach(el => {
            const btn = el as HTMLElement;
            btn.onclick = async () => {
                if (!await showConfirmModal('Delete Transaction', 'Are you sure you want to delete this transaction? This action cannot be undone.')) return;

                try {
                    await apiRequest('DELETE', `/api/admin/transaction/${btn.dataset.id}`);
                    BalanceChangedEvent.notify();
                    notify('Success', 'Transaction deleted', 'success');
                    renderTransactionsTab(container, userId);
                } catch (e) {
                    notify('Error', 'Failed to delete', 'error');
                }
            };
        });

        setupTransactionEditHandlers(container, userId);

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="error-text">Error loading transactions.</p>';
    }
}

/**
 * Sets up state-switching logic for inline transaction editing.
 */
function setupTransactionEditHandlers(container: HTMLElement, userId: number | string): void {
    const toggleEdit = (item: HTMLElement, edit: boolean) => {
        const details = item.querySelector('.item-details');
        const valueGroup = item.querySelector('.item-value-group');
        const editContainer = item.querySelector('.tx-edit-grid');
        const actions = item.querySelector('.item-actions') as HTMLElement;

        const show = (el: Element | null) => el?.classList.remove('hidden');
        const hide = (el: Element | null) => el?.classList.add('hidden');

        if (edit) {
            hide(details);
            hide(valueGroup);
            show(editContainer);
            hide(actions.querySelector('.edit-tx-btn'));
            show(actions.querySelector('.save-tx-btn'));
            show(actions.querySelector('.cancel-tx-btn'));
            hide(actions.querySelector('.delete-tx-btn'));
        } else {
            show(details);
            show(valueGroup);
            hide(editContainer);
            show(actions.querySelector('.edit-tx-btn'));
            hide(actions.querySelector('.save-tx-btn'));
            hide(actions.querySelector('.cancel-tx-btn'));
            show(actions.querySelector('.delete-tx-btn'));
        }
    };

    container.querySelectorAll('.edit-tx-btn').forEach(el => {
        const btn = el as HTMLElement;
        btn.onclick = () => toggleEdit(btn.closest('.transaction-item') as HTMLElement, true);
    });

    container.querySelectorAll('.cancel-tx-btn').forEach(el => {
        const btn = el as HTMLElement;
        btn.onclick = () => toggleEdit(btn.closest('.transaction-item') as HTMLElement, false);
    });

    container.querySelectorAll('.save-tx-btn').forEach(el => {
        const btn = el as HTMLElement;
        btn.onclick = async () => {
            const item = btn.closest('.transaction-item') as HTMLElement;
            const id = btn.dataset.id;
            const amount = (item.querySelector('.tx-amount-input') as HTMLInputElement).value;
            const description = (item.querySelector('.tx-desc-input') as HTMLInputElement).value;

            try {
                await apiRequest('PUT', `/api/admin/transaction/${id}`, { amount, description });
                BalanceChangedEvent.notify();
                notify('Success', 'Transaction updated', 'success');
                renderTransactionsTab(container, userId);
            } catch (e) {
                notify('Error', 'Failed to update transaction', 'error');
            }
        };
    });
}
import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { notify } from '/js/components/notification.js';
import { showConfirmModal } from '/js/utils/modal.js';
import { WALLET_SVG, ADD_SVG, REMOVE_SVG, EDIT_SVG, SAVE_SVG, CLOSE_SVG, DELETE_SVG } from '../../../../../images/icons/outline/icons.js';

/**
 * Fetches and renders the transactions for the user.
 */
export async function renderTransactionsTab(container, userId) {
    container.innerHTML = '<p class="loading-text">Loading transactions...</p>';
    try {
        const transactions = await ajaxGet(`/api/admin/user/${userId}/transactions`);

        let html = `
            <div class="detail-card full-width">
                <header>
                    ${WALLET_SVG}
                    <h3>Transaction History</h3>
                </header>
                <div class="card-body">
                    <!-- New Transaction Form -->
                    <div class="transaction-item glass-panel new-entry-row" style="margin-bottom: 2.5rem; border: 1px dashed var(--pico-primary); display: flex; align-items: center; padding: 1rem 1.25rem;">
                        <div class="tx-edit-grid" style="display:grid; grid-template-columns: 1fr 140px auto; gap: 1rem; width: 100%; align-items: center;">
                            <input id="new-tx-desc" type="text" placeholder="Description (e.g. Top Up)" class="compact-input" style="margin-bottom:0;">
                            <input id="new-tx-amount" type="number" step="0.01" placeholder="Amount" class="compact-input" style="margin-bottom:0;">
                            <button id="add-tx-btn" class="primary small-btn icon-text-btn" style="margin:0; min-width: 100px;">${ADD_SVG} Add</button>
                        </div>
                    </div>

                    <div class="transaction-list" id="admin-tx-list">
        `;

        if (!transactions || transactions.length === 0) {
            html += '<p class="empty-text" style="padding:1rem; text-align:center;">No transactions found.</p>';
        } else {
            transactions.forEach(tx => {
                const isNegative = tx.amount < 0;
                const icon = isNegative ? REMOVE_SVG : ADD_SVG;
                const iconClass = isNegative ? 'negative' : 'positive';
                const dateStr = new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

                html += `
                    <div class="transaction-item glass-panel" data-id="${tx.id}" style="display: flex; align-items: center; padding: 1rem;">
                        <div class="tx-icon ${iconClass}">${icon}</div>
                        
                        <!-- Display Mode -->
                        <div class="tx-display-content" style="flex-grow: 1; display: flex; align-items: center;">
                            <div class="tx-details" style="flex-grow: 1;">
                                <span class="tx-title">${tx.description}</span>
                                <span class="tx-date">${dateStr}</span>
                            </div>
                            <div class="tx-amount-group" style="text-align: right; min-width: 100px;">
                                <span class="tx-amount ${iconClass}">${isNegative ? '' : '+'}${tx.amount.toFixed(2)}</span>
                                <span class="tx-balance-after">£${tx.after !== undefined ? tx.after.toFixed(2) : 'N/A'}</span>
                            </div>
                        </div>

                        <!-- Edit Mode (Hidden by default) -->
                        <div class="tx-edit-grid hidden" style="flex-grow: 1; display: grid; grid-template-columns: 1fr 140px; gap: 1rem; align-items: center;">
                            <input class="tx-desc-input compact-input" value="${tx.description}" style="margin-bottom:0;">
                            <input type="number" step="0.01" class="tx-amount-input compact-input" value="${tx.amount}" style="text-align: left; margin-bottom:0;">
                        </div>

                        <div class="tx-actions" style="margin-left: 1rem; display: flex; gap: 0.25rem;">
                            <button class="icon-btn edit-tx-btn" data-id="${tx.id}" title="Edit">${EDIT_SVG}</button>
                            <button class="icon-btn save-tx-btn hidden success" data-id="${tx.id}" title="Save">${SAVE_SVG}</button>
                            <button class="icon-btn cancel-tx-btn hidden warning" data-id="${tx.id}" title="Cancel">${CLOSE_SVG}</button>
                            <button class="icon-btn delete-tx-btn delete" data-id="${tx.id}" title="Delete">${DELETE_SVG}</button>
                        </div>
                    </div>
                `;
            });
        }

        html += `   </div>
                </div>
            </div>`;
        container.innerHTML = html;

        // ... Bind events ...
        document.getElementById('add-tx-btn').onclick = async () => {
            const amount = document.getElementById('new-tx-amount').value;
            const description = document.getElementById('new-tx-desc').value;
            if (!amount || !description) return notify('Error', 'Please fill all fields', 'error');
            await ajaxPost(`/api/admin/user/${userId}/transaction`, { amount, description });
            notify('Success', 'Transaction added', 'success');
            renderTransactionsTab(container, userId);
        };

        container.querySelectorAll('.delete-tx-btn').forEach(btn => {
            btn.onclick = async () => {
                if (!await showConfirmModal('Delete Transaction', 'Are you sure you want to delete this transaction? This action cannot be undone.')) return;
                if (await fetch(`/api/admin/transaction/${btn.dataset.id}`, { method: 'DELETE' }).then(r => r.ok)) {
                    notify('Success', 'Transaction deleted', 'success');
                    renderTransactionsTab(container, userId);
                } else notify('Error', 'Failed to delete', 'error');
            };
        });

        setupTransactionEditHandlers(container, userId);

    } catch (e) {
        container.innerHTML = '<p class="error-text">Error loading transactions.</p>';
    }
}

/**
 * Sets up event handlers for editing transactions.
 */
function setupTransactionEditHandlers(container, userId) {
    const toggleEdit = (item, edit) => {
        const displayContainer = item.querySelector('.tx-display-content');
        const editContainer = item.querySelector('.tx-edit-grid');
        const actions = item.querySelector('.tx-actions');

        const show = (el) => el?.classList.remove('hidden');
        const hide = (el) => el?.classList.add('hidden');

        if (edit) {
            hide(displayContainer);
            show(editContainer);
            hide(actions.querySelector('.edit-tx-btn'));
            show(actions.querySelector('.save-tx-btn'));
            show(actions.querySelector('.cancel-tx-btn'));
            hide(actions.querySelector('.delete-tx-btn'));
        } else {
            show(displayContainer);
            hide(editContainer);
            show(actions.querySelector('.edit-tx-btn'));
            hide(actions.querySelector('.save-tx-btn'));
            hide(actions.querySelector('.cancel-tx-btn'));
            show(actions.querySelector('.delete-tx-btn'));
        }
    };

    container.querySelectorAll('.edit-tx-btn').forEach(btn => {
        btn.onclick = () => toggleEdit(btn.closest('.transaction-item'), true);
    });

    container.querySelectorAll('.cancel-tx-btn').forEach(btn => {
        btn.onclick = () => toggleEdit(btn.closest('.transaction-item'), false);
    });

    container.querySelectorAll('.save-tx-btn').forEach(btn => {
        btn.onclick = async () => {
            const item = btn.closest('.transaction-item');
            const id = btn.dataset.id;
            const amount = item.querySelector('.tx-amount-input').value;
            const description = item.querySelector('.tx-desc-input').value;

            const res = await fetch(`/api/admin/transaction/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, description })
            });

            if (res.ok) {
                notify('Success', 'Transaction updated', 'success');
                renderTransactionsTab(container, userId);
            } else {
                notify('Error', 'Failed to update transaction', 'error');
            }
        };
    });
}

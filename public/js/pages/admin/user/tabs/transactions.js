/**
 * transactions.js (Admin User Tab)
 * 
 * Renders the "Transactions" tab within the administrative user management view.
 * Provides a full financial ledger for the user, allowing admins to manually
 * add credits/debits, edit existing records, and delete erroneous entries.
 */

import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { notify } from '/js/components/notification.js';
import { showConfirmModal } from '/js/utils/modal.js';
import { WALLET_SVG, ADD_SVG, REMOVE_SVG, EDIT_SVG, SAVE_SVG, CLOSE_SVG, DELETE_SVG } from '../../../../../images/icons/outline/icons.js';

/**
 * Main rendering and logic binding function for the Admin Transactions tab.
 * 
 * @param {HTMLElement} container - Tab content area.
 * @param {number|string} userId - ID of the user whose finances are being managed.
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
                    <!-- Manual Transaction Insertion Form -->
                    <div class="transaction-item glass-panel new-entry-row">
                        <div class="tx-edit-grid">
                            <input id="new-tx-desc" type="text" placeholder="Description (e.g. Top Up)" class="compact-input mb-0">
                            <input id="new-tx-amount" type="number" step="0.01" placeholder="Amount" class="compact-input mb-0">
                            <button id="add-tx-btn" class="primary small-btn icon-text-btn mb-0 min-w-100">${ADD_SVG} Add</button>
                        </div>
                    </div>

                    <div class="transaction-list" id="admin-tx-list">
        `;

        if (!transactions || transactions.length === 0) {
            html += '<p class="empty-text">No transactions found.</p>';
        } else {
            // Render existing transaction items
            transactions.forEach(tx => {
                const isNegative = tx.amount < 0;
                const icon = isNegative ? REMOVE_SVG : ADD_SVG;
                const iconClass = isNegative ? 'negative' : 'positive';
                const dateStr = new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

                html += `
                    <div class="transaction-item glass-panel" data-id="${tx.id}">
                        <div class="tx-icon ${iconClass}">${icon}</div>
                        
                        <!-- Read-only Mode -->
                        <div class="tx-display-content">
                            <div class="tx-details">
                                <span class="tx-title">${tx.description}</span>
                                <span class="tx-date">${dateStr}</span>
                            </div>
                            <div class="tx-amount-group">
                                <span class="tx-amount ${iconClass}">${isNegative ? '' : '+'}${tx.amount.toFixed(2)}</span>
                                <span class="tx-balance-after">£${tx.after !== undefined ? tx.after.toFixed(2) : 'N/A'}</span>
                            </div>
                        </div>

                        <!-- Inline Edit Mode (Hidden by default) -->
                        <div class="tx-edit-grid no-btn hidden">
                            <input class="tx-desc-input compact-input mb-0" value="${tx.description}">
                            <input type="number" step="0.01" class="tx-amount-input compact-input text-left mb-0" value="${tx.amount}">
                        </div>

                        <!-- Row Actions -->
                        <div class="tx-actions">
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

        // --- Logic Binding ---

        // Add New Transaction Handler
        document.getElementById('add-tx-btn').onclick = async () => {
            const amount = document.getElementById('new-tx-amount').value;
            const description = document.getElementById('new-tx-desc').value;
            if (!amount || !description) return notify('Error', 'Please fill all fields', 'error');
            
            try {
                await ajaxPost(`/api/admin/user/${userId}/transaction`, { amount, description });
                notify('Success', 'Transaction added', 'success');
                // Recursive refresh
                renderTransactionsTab(container, userId);
            } catch (e) {
                notify('Error', 'Failed to add', 'error');
            }
        };

        // Bulk Delete Handler
        container.querySelectorAll('.delete-tx-btn').forEach(btn => {
            btn.onclick = async () => {
                if (!await showConfirmModal('Delete Transaction', 'Are you sure you want to delete this transaction? This action cannot be undone.')) return;
                
                try {
                    const res = await fetch(`/api/admin/transaction/${btn.dataset.id}`, { method: 'DELETE' });
                    if (res.ok) {
                        notify('Success', 'Transaction deleted', 'success');
                        renderTransactionsTab(container, userId);
                    } else throw new Error();
                } catch (e) {
                    notify('Error', 'Failed to delete', 'error');
                }
            };
        });

        // Initialize Inline Editing Logic
        setupTransactionEditHandlers(container, userId);

    } catch (e) {
        container.innerHTML = '<p class="error-text">Error loading transactions.</p>';
    }
}

/**
 * Sets up state-switching logic for inline transaction editing.
 * Handles toggling between display and input modes.
 * 
 * @param {HTMLElement} container 
 * @param {number|string} userId 
 */
function setupTransactionEditHandlers(container, userId) {
    /**
     * Toggles the UI state of a single transaction row.
     * @param {HTMLElement} item - The row container.
     * @param {boolean} edit - Target state.
     */
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

    // Save Edit Handler
    container.querySelectorAll('.save-tx-btn').forEach(btn => {
        btn.onclick = async () => {
            const item = btn.closest('.transaction-item');
            const id = btn.dataset.id;
            const amount = item.querySelector('.tx-amount-input').value;
            const description = item.querySelector('.tx-desc-input').value;

            try {
                const res = await fetch(`/api/admin/transaction/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount, description })
                });

                if (res.ok) {
                    notify('Success', 'Transaction updated', 'success');
                    renderTransactionsTab(container, userId);
                } else throw new Error();
            } catch (e) {
                notify('Error', 'Failed to update transaction', 'error');
            }
        };
    });
}
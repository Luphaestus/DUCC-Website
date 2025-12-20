import { ajaxGet } from './misc/ajax.js';
import { ViewChangedEvent } from './misc/view.js';

// --- Constants & Templates ---

const HTML_TEMPLATE = `<div id="/transactions-view" class="view hidden small-container">
            <h1>Your Transactions</h1>
            <div id="transactions-list">
                <p aria-busy="true">Loading transactions...</p>
            </div>
        </div>`;

// --- Main Update Function ---

/**
 * Fetches the user's transactions and renders them in a table.
 * @returns {Promise<void>} A promise that resolves when the update is complete.
 */
async function updateTransactions() {
    const transactionsView = document.getElementById('transactions-list');
    if (!transactionsView) return;

    const response = await ajaxGet('/api/user/elements/transactions') || {};
    const transactions = Array.isArray(response.transactions) ? response.transactions : [];
    transactionsView.innerHTML = '';

    if (transactions.length === 0) {
        transactionsView.innerHTML = '<p>You have no transactions.</p>';
        return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Date', 'Description', 'Amount (£)', 'Balance After (£)'].forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    if (!Array.isArray(transactions)) {
        console.error('Expected transactions to be an array, but got:', transactions);
        return;
    }

    transactions.forEach(tx => {
        const row = document.createElement('tr');

        const dateCell = document.createElement('td');
        dateCell.textContent = new Date(tx.created_at).toLocaleDateString();
        row.appendChild(dateCell);

        const descCell = document.createElement('td');
        descCell.textContent = tx.description;
        row.appendChild(descCell);

        const amountCell = document.createElement('td');
        amountCell.textContent = tx.amount.toFixed(2);
        row.appendChild(amountCell);

        const balanceCell = document.createElement('td');
        balanceCell.textContent = tx.after !== undefined ? tx.after.toFixed(2) : 'N/A';
        row.appendChild(balanceCell);

        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    transactionsView.appendChild(table);
}

/**
 * Only update transactions view when navigated to /transactions.
 * @param {object} params - The path navigated to.
 */
function NavigationEventListner({ resolvedPath }) {
    if (resolvedPath === '/transactions') {
        updateTransactions();
    }
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    ViewChangedEvent.subscribe(NavigationEventListner);
});



document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);
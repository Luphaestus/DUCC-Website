import { ajaxGet } from './misc/ajax.js';
import { ViewChangedEvent } from './misc/view.js';
import { requireAuth } from './misc/auth.js';

/**
 * Transactions View Module.
 * Provides users with a detailed view of their financial history with the club.
 * Renders a table showing the date, description, amount, and resulting balance 
 * for each transaction.
 */

// --- Constants & Templates ---

const HTML_TEMPLATE = `<div id="/transactions-view" class="view hidden small-container">
            <h1>Your Transactions</h1>
            <div id="transactions-list">
                <p aria-busy="true">Loading transactions...</p>
            </div>
        </div>`;

// --- Main Update Function ---

/**
 * Fetches the user's transaction data from the server and renders a table.
 * Enhances the raw data with formatted currency strings and dates.
 */
async function updateTransactions() {
    const transactionsView = document.getElementById('transactions-list');
    if (!transactionsView) return;

    // Fetch transactions list
    const response = await ajaxGet('/api/user/elements/transactions') || {};
    const transactions = Array.isArray(response.transactions) ? response.transactions : [];
    
    // Clear loading state
    transactionsView.innerHTML = '';

    if (transactions.length === 0) {
        transactionsView.innerHTML = '<p>You have no transactions.</p>';
        return;
    }

    // Build the results table
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
    
    // Iterate through records and create rows
    transactions.forEach(tx => {
        const row = document.createElement('tr');

        // Formatted Date
        const dateCell = document.createElement('td');
        dateCell.textContent = new Date(tx.created_at).toLocaleDateString('en-GB');
        row.appendChild(dateCell);

        // Description (e.g., "Event Upfront Cost", "Membership Fee")
        const descCell = document.createElement('td');
        descCell.textContent = tx.description;
        row.appendChild(descCell);

        // Transaction Amount
        const amountCell = document.createElement('td');
        amountCell.textContent = tx.amount.toFixed(2);
        row.appendChild(amountCell);

        // Resulting Balance (calculated by backend)
        const balanceCell = document.createElement('td');
        balanceCell.textContent = tx.after !== undefined ? tx.after.toFixed(2) : 'N/A';
        row.appendChild(balanceCell);

        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    transactionsView.appendChild(table);
}

/**
 * SPA Navigation Listener.
 * Triggered when the user navigates to the transactions view.
 * Ensures the user is logged in before fetching data.
 */
async function NavigationEventListner({ resolvedPath }) {
    if (resolvedPath === '/transactions') {
        if (!await requireAuth()) return;
        updateTransactions();
    }
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    // Register for view changes
    ViewChangedEvent.subscribe(NavigationEventListner);
});


// Register view template with main container
document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);
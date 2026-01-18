import { ajaxGet } from '/js/utils/ajax.js';
import { ViewChangedEvent, addRoute } from '/js/utils/view.js';
import { requireAuth } from '/js/utils/auth.js';

/**
 * User financial history view.
 * @module Transactions
 */

addRoute('/transactions', 'transactions');

const HTML_TEMPLATE = /*html*/`<div id="transactions-view" class="view hidden small-container">
            <h1>Your Transactions</h1>
            <div id="transactions-list">
                <p aria-busy="true">Loading transactions...</p>
            </div>
        </div>`;

/**
 * Fetch and render transaction table.
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
    ['Date', 'Description', 'Amount (£)', 'Balance After (£)'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    transactions.forEach(tx => {
        const row = document.createElement('tr');
        [
            new Date(tx.created_at).toLocaleDateString('en-GB'),
            tx.description,
            tx.amount.toFixed(2),
            tx.after !== undefined ? tx.after.toFixed(2) : 'N/A'
        ].forEach(text => {
            const td = document.createElement('td');
            td.textContent = text;
            row.appendChild(td);
        });
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    const wrapper = document.createElement('div');
    wrapper.classList.add('table-responsive');
    wrapper.appendChild(table);
    transactionsView.appendChild(wrapper);
}

/**
 * Handle view switch to transactions.
 */
async function NavigationEventListner({ resolvedPath }) {
    if (resolvedPath === '/transactions') {
        if (!await requireAuth()) return;
        updateTransactions();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    ViewChangedEvent.subscribe(NavigationEventListner);
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);
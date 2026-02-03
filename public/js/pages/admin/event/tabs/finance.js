/**
 * finance.js (Admin Event Tab)
 * 
 * Renders the combined "Transport, Finance & Attendance" tab.
 */

import { apiRequest } from '/js/utils/api.js';
import { notify } from '/js/components/notification.js';
import { showConfirmModal } from '/js/utils/modal.js';
import { switchView } from '/js/utils/view.js';
import { setupNumberInput, downloadCSV } from '/js/utils/utils.js';
import { Panel } from '/js/widgets/panel.js';
import { Modal } from '/js/widgets/Modal.js';
import { Pagination } from '/js/widgets/Pagination.js';
import { CURRENCY_POUND_SVG, ADD_SVG, TRIP_SVG, CHECK_SVG, CLOSE_SVG, EDIT_SVG, GROUP_SVG, WALLET_SVG, DELETE_SVG } from '/images/icons/outline/icons.js';
import { renderAvatar } from '/js/utils/avatar.js';

export async function renderFinanceTab(container, event, attendees, userPerms) {
    container.innerHTML = `
        <div class="finance-management-layout">
            <div id="admin-attendees-container" class="mb-6"></div>
            
            ${event.is_offsite ? `<div id="admin-transport-container" class="mb-6"></div>` : ''}

            <div id="admin-expenses-container" class="mb-6"></div>

            <div id="finance-summary-section" class="hidden"></div>
        </div>
    `;

    const attendeesContainer = container.querySelector('#admin-attendees-container');
    const transportContainer = container.querySelector('#admin-transport-container');
    const expensesContainer = container.querySelector('#admin-expenses-container');
    const summarySection = container.querySelector('#finance-summary-section');

    let attendeePage = 1;
    const attendeePageSize = 5;
    let attendeeFilter = '';
    let attendeesListFull = [];

    const loadAllData = async () => {
        try {
            const [attendeesRes, tripsRes, driversRes, expensesRes, summaryRes] = await Promise.all([
                apiRequest('GET', `/api/event/${event.id}/attendees`),
                event.is_offsite ? apiRequest('GET', `/api/events/${event.id}/trips`) : Promise.resolve({ data: [] }),
                event.is_offsite ? apiRequest('GET', `/api/admin/events/${event.id}/drivers`) : Promise.resolve({ data: [] }),
                apiRequest('GET', `/api/events/${event.id}/expenses`),
                apiRequest('GET', `/api/admin/events/${event.id}/finance-summary`)
            ]);

            attendeesListFull = attendeesRes.attendees || [];
            const trips = tripsRes.data || [];
            const drivers = driversRes.data || [];
            const expenses = expensesRes.data || [];
            const summary = summaryRes.data || { breakdown: [] };

            const renderAttendees = () => {
                const canRefundPerm = userPerms.includes('transaction.manage') || userPerms.includes('event.manage.all');
                
                const filteredAttendees = attendeesListFull.filter(a => 
                    `${a.first_name} ${a.last_name}`.toLowerCase().includes(attendeeFilter.toLowerCase()) ||
                    (a.email && a.email.toLowerCase().includes(attendeeFilter.toLowerCase()))
                );

                const totalAttendeePages = Math.ceil(filteredAttendees.length / attendeePageSize);
                if (attendeePage > totalAttendeePages && totalAttendeePages > 0) attendeePage = totalAttendeePages;
                const displayAttendees = filteredAttendees.slice((attendeePage - 1) * attendeePageSize, attendeePage * attendeePageSize);

                attendeesContainer.innerHTML = Panel({
                    title: 'Participant Management',
                    icon: GROUP_SVG,
                    action: `
                        <div class="admin-attendee-controls" style="display: flex; gap: 0.5rem; align-items: center;">
                            <input type="text" id="attendee-filter-input" placeholder="Filter list..." class="modern-input small" style="margin-bottom: 0; width: 180px;" value="${attendeeFilter}">
                            ${!event.costs_released ? `<button id="admin-add-participant-btn" class="small-btn primary mini-btn">${ADD_SVG} Add</button>` : ''}
                        </div>
                    `,
                    content: `
                        <div id="admin-attendees-list">
                            <div class="glass-table-container">
                                <div class="table-responsive">
                                    <table class="glass-table">
                                        <thead>
                                            <tr><th>Attendee</th><th>Status</th><th class="text-right">Action</th></tr>
                                        </thead>
                                        <tbody>
                                            ${displayAttendees.map(a => `
                                                <tr>
                                                    <td class="primary-text">
                                                        <div class="user-info-cell">
                                                            ${renderAvatar(a, { classes: 'mini' })}
                                                            <span>${a.first_name} ${a.last_name}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        ${a.is_attending ? 
                                                            `<span class="badge success">Attending${a.upfront_refunded ? ' - Refunded' : ''}</span>` : 
                                                            `<span class="badge neutral">Left${a.upfront_refunded ? ' - Refunded' : ''}</span>`}
                                                    </td>
                                                    <td class="text-right">
                                                        <div class="button-group mini justify-end">
                                                            ${a.is_attending && !event.costs_released ? `<button class="small-btn outline delete" data-remove-attendee="${a.id}">Remove</button>` : ''}
                                                            ${canRefundPerm && a.payment_transaction_id && !a.upfront_refunded ? `<button class="small-btn outline secondary" data-refund-upfront="${a.id}">Refund</button>` : ''}
                                                        </div>
                                                    </td>
                                                </tr>
                                            `).join('') || '<tr><td colspan="3" class="empty-cell">No participants found.</td></tr>'}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div id="attendees-pagination" class="mt-4 flex justify-center"></div>
                        </div>
                    `
                });

                // Re-bind Attendee Listeners
                const filterInput = attendeesContainer.querySelector('#attendee-filter-input');
                filterInput.oninput = (e) => {
                    attendeeFilter = e.target.value;
                    renderAttendees();
                    // Focus back since re-render loses it
                    const newInput = attendeesContainer.querySelector('#attendee-filter-input');
                    newInput.focus();
                    newInput.setSelectionRange(attendeeFilter.length, attendeeFilter.length);
                };

                const addBtn = attendeesContainer.querySelector('#admin-add-participant-btn');
                if (addBtn) addBtn.onclick = () => openAddParticipantModal(event.id, loadAllData);

                const pagerContainer = attendeesContainer.querySelector('#attendees-pagination');
                if (pagerContainer) {
                    const pager = new Pagination(pagerContainer, (page) => {
                        attendeePage = page;
                        renderAttendees();
                    });
                    pager.render(attendeePage, totalAttendeePages);
                }

                attendeesContainer.querySelectorAll('[data-remove-attendee]').forEach(btn => {
                    btn.onclick = async () => {
                        if (!await showConfirmModal('Remove?', 'Remove participant?')) return;
                        try {
                            await apiRequest('DELETE', `/api/admin/events/${event.id}/attendees/${btn.dataset.removeAttendee}`);
                            notify('Success', 'Removed.', 'success', 5000, 'admin-attendee'); loadAllData();
                        } catch (e) { notify('Error', e.message, 'error', 5000, 'admin-attendee'); }
                    };
                });

                attendeesContainer.querySelectorAll('[data-refund-upfront]').forEach(btn => {
                    btn.onclick = async () => {
                        if (!await showConfirmModal('Refund?', 'Refund upfront fee?')) return;
                        try {
                            await apiRequest('POST', `/api/admin/events/${event.id}/attendees/${btn.dataset.refundUpfront}/refund-upfront`);
                            notify('Success', 'Refunded.', 'success', 5000, 'admin-attendee'); loadAllData();
                        } catch (e) { notify('Error', e.message, 'error', 5000, 'admin-attendee'); }
                    };
                });
            };

            renderAttendees();

            // --- Render Transport Panel ---
            if (transportContainer) {
                transportContainer.innerHTML = Panel({
                    title: 'Trips & Transport',
                    icon: TRIP_SVG,
                    action: !event.costs_released ? `<button type="button" id="admin-add-trip-btn" class="small-btn primary mini-btn">${ADD_SVG} New Trip</button>` : '',
                    content: `
                        <div id="admin-trips-list" class="finance-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
                            ${trips.map(trip => {
                                const tripDrivers = drivers.filter(d => d.trip_id === trip.id);
                                const totalSeats = tripDrivers.filter(d => d.status === 'accepted').reduce((sum, d) => sum + d.seats, 0);
                                const totalBoats = tripDrivers.filter(d => d.status === 'accepted').reduce((sum, d) => sum + d.boats, 0);

                                return `
                                    <div class="trip-admin-card glass-panel secondary-bg">
                                        <div class="trip-info"><strong>${trip.name}</strong><br><small>${totalSeats} Seats / ${totalBoats} Boats</small></div>
                                        <div class="trip-actions mt-4">
                                            <button type="button" class="small-btn secondary full-width mb-2" data-manage-trip-drivers="${trip.id}">${!event.costs_released ? 'Drivers' : 'View Drivers'} (${tripDrivers.length})</button>
                                            ${!event.costs_released ? `<button type="button" class="small-btn outline full-width" data-manage-trip-exclusions="${trip.id}">Exclusions</button>` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('') || '<p class="muted-text">No trips defined.</p>'}
                        </div>
                    `
                });

                const addTripBtn = transportContainer.querySelector('#admin-add-trip-btn');
                if (addTripBtn) addTripBtn.onclick = () => openAddTripModal(event.id, loadAllData);
                transportContainer.querySelectorAll('[data-manage-trip-drivers]').forEach(btn => {
                    btn.onclick = () => openManageDriversModal(event.id, btn.dataset.manageTripDrivers, attendeesListFull, loadAllData, event.costs_released);
                });
                transportContainer.querySelectorAll('[data-manage-trip-exclusions]').forEach(btn => {
                    btn.onclick = () => openExclusionsModal('trip', btn.dataset.manageTripExclusions, attendeesListFull, loadAllData);
                });
            }

            // --- Render Expenses Panel ---
            expensesContainer.innerHTML = Panel({
                title: 'Event Expenses',
                icon: WALLET_SVG,
                action: !event.costs_released ? `<button type="button" id="admin-add-expense-btn" class="small-btn primary mini-btn">${ADD_SVG} New Expense</button>` : '',
                content: `
                    <div id="admin-expenses-list" class="finance-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
                        ${expenses.map(e => `
                            <div class="expense-admin-card glass-panel secondary-bg">
                                <div class="expense-info"><strong>£${e.amount.toFixed(2)}</strong> - ${e.first_name}<p class="desc small-text mt-1">${e.description}</p></div>
                                ${!event.costs_released ? `<div class="expense-actions mt-4"><button type="button" class="small-btn outline full-width" data-manage-expense-exclusions="${e.id}">Exclusions</button></div>` : ''}
                            </div>
                        `).join('') || '<p class="muted-text">No expenses reported.</p>'}
                    </div>
                `
            });

            const addExpenseBtn = expensesContainer.querySelector('#admin-add-expense-btn');
            if (addExpenseBtn) addExpenseBtn.onclick = () => openAddExpenseModal(event.id, attendeesListFull, loadAllData);
            expensesContainer.querySelectorAll('[data-manage-expense-exclusions]').forEach(btn => {
                btn.onclick = () => openExclusionsModal('expense', btn.dataset.manageExpenseExclusions, attendeesListFull, loadAllData);
            });

            // --- Render Summary Panel ---
            const hasCosts = expenses.length > 0 || (summary.breakdown && summary.breakdown.some(row => row.spent > 0 || row.mileage > 0));
            if (hasCosts) {
                summarySection.classList.remove('hidden');

                // 1. Prepare individual Cost Items for the Matrix
                const costItems = [
                    ...(summary.trips || []).map(t => ({
                        id: `trip-${t.id}`,
                        name: t.name,
                        type: 'Trip',
                        share: t.share,
                        total: t.total_reimbursement,
                        excludedIds: t.excluded_ids || [],
                        contributions: t.drivers.reduce((acc, d) => { acc[d.user_id] = d.reimbursement; return acc; }, {})
                    })),
                    ...(summary.expenses || []).map(e => ({
                        id: `exp-${e.id}`,
                        name: e.description,
                        type: 'Exp',
                        share: e.share,
                        total: e.amount,
                        excludedIds: e.excluded_ids || [],
                        contributions: { [e.payer_id]: e.amount }
                    }))
                ];

                const tripTablesHtml = (summary.trips || []).map(trip => {
                    const rows = trip.drivers.map(d => `
                        <tr>
                            <td class="primary-text">${d.name}</td>
                            <td>${d.miles}</td>
                            <td class="amount">£${d.reimbursement.toFixed(2)}</td>
                            <td>${trip.eligible_count}</td>
                        </tr>
                    `).join('');

                    return `
                        <div class="mb-6">
                            <h5 class="small-title">${TRIP_SVG} Trip: ${trip.name}</h5>
                            <div class="glass-table-container">
                                <div class="table-responsive">
                                    <table class="glass-table compact">
                                        <thead><tr><th>Driver</th><th>Miles</th><th>Cost</th><th>Payers (Eligible)</th></tr></thead>
                                        <tbody>${rows}</tbody>
                                        <tfoot>
                                            <tr class="sum-row">
                                                <td><strong>Total Trip Cost</strong></td>
                                                <td></td>
                                                <td class="amount"><strong>£${trip.total_reimbursement.toFixed(2)}</strong></td>
                                                <td><strong>£${trip.share.toFixed(2)} each</strong></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                const expenseTablesHtml = (summary.expenses || []).map(e => `
                    <div class="mb-6">
                        <h5 class="small-title">${WALLET_SVG} Expense: ${e.description}</h5>
                        <div class="glass-table-container">
                            <div class="table-responsive">
                                <table class="glass-table compact">
                                    <thead><tr><th>Payer</th><th>Description</th><th>Amount</th><th>Payers (Eligible)</th></tr></thead>
                                    <tbody>
                                        <tr>
                                            <td class="primary-text">${e.payer_name}</td>
                                            <td>${e.description}</td>
                                            <td class="amount">£${e.amount.toFixed(2)}</td>
                                            <td>${e.eligible_count}</td>
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr class="sum-row">
                                            <td colspan="2"><strong>Subtotal</strong></td>
                                            <td class="amount"><strong>£${e.amount.toFixed(2)}</strong></td>
                                            <td><strong>£${e.share.toFixed(2)} each</strong></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                `).join('');

                // 2. Personal Settlement Matrix Header
                const matrixHeaderHtml = `
                    <tr>
                        <th>Member</th>
                        ${costItems.map(item => `<th class="text-center" title="${item.type}: ${item.name}">${item.name}</th>`).join('')}
                        <th class="text-right">Total Contributed</th>
                        <th class="text-right">Total Share</th>
                        <th class="text-right">Net Change</th>
                    </tr>
                `;

                // 3. Personal Settlement Matrix Rows
                const matrixRowsHtml = (summary.breakdown || []).map(row => {
                    const cells = costItems.map(item => {
                        const isExcluded = item.excludedIds.includes(row.id);
                        const contribution = item.contributions[row.id] || 0;
                        
                        if (isExcluded && contribution === 0) return '<td class="text-center muted-text">-</td>';

                        let content = '';
                        if (!isExcluded) content += `<div style="font-size: 0.85rem;">£${item.share.toFixed(2)}</div>`;
                        if (contribution > 0) content += `<div class="text-success" style="font-weight: 700; font-size: 0.8rem;">+£${contribution.toFixed(2)}</div>`;

                        return `<td class="text-center">${content || '<span class="muted-text">-</span>'}</td>`;
                    }).join('');

                    const totalContributed = row.spent + row.mileage;

                    return `
                        <tr>
                            <td class="primary-text">${row.name}</td>
                            ${cells}
                            <td class="amount text-right ${totalContributed > 0 ? 'text-success' : 'muted-text'}">
                                ${totalContributed > 0 ? `£${totalContributed.toFixed(2)}` : '-'}
                            </td>
                            <td class="amount text-right">-£${row.shared_cost_share.toFixed(2)}</td>
                            <td class="${row.net >= 0 ? 'text-success' : 'text-error'} text-right amount" style="font-weight: 700;">
                                ${row.net >= 0 ? '+' : ''}£${row.net.toFixed(2)}
                            </td>
                        </tr>
                    `;
                }).join('');

                const generateSettlementCSV = () => {
                    const csvData = [];
                    
                    // 1. Header
                    csvData.push([`Financial Settlement for ${event.title}`]);
                    const releaseTime = summary.released_at ? new Date(summary.released_at).toLocaleString() : 'Not Yet Finalized';
                    csvData.push([`Finalized at: ${releaseTime}`]);
                    csvData.push([]);

                    // 2. Trip Calculations
                    csvData.push(['1. SHARED COST CALCULATIONS: TRIPS']);
                    (summary.trips || []).forEach(trip => {
                        csvData.push([`Trip: ${trip.name}`, `Total: £${trip.total_reimbursement.toFixed(2)}`, `Share: £${trip.share.toFixed(2)} each`, `${trip.eligible_count} Payers`]);
                        csvData.push(['Driver', 'Miles', 'Cost']);
                        trip.drivers.forEach(d => csvData.push([d.name, d.miles, d.reimbursement.toFixed(2)]));
                        csvData.push([]);
                    });

                    // 3. Other Expense Calculations
                    csvData.push(['2. SHARED COST CALCULATIONS: OTHER EXPENSES']);
                    (summary.expenses || []).forEach(e => {
                        csvData.push([`Expense: ${e.description}`, `Total: £${e.amount.toFixed(2)}`, `Share: £${e.share.toFixed(2)} each`, `${e.eligible_count} Payers`]);
                        csvData.push(['Payer', 'Description', 'Amount']);
                        csvData.push([e.payer_name, e.description, e.amount.toFixed(2)]);
                        csvData.push([]);
                    });

                    // 4. Personal Settlement Matrix
                    csvData.push(['3. PERSONAL SETTLEMENT MATRIX']);
                    csvData.push(['Member', ...costItems.map(i => i.name), 'Total Contributed', 'Total Share', 'Net Change']);
                    
                    summary.breakdown.forEach(row => {
                        const matrixCols = costItems.map(item => {
                            const contribution = item.contributions[row.id] || 0;
                            const share = item.excludedIds.includes(row.id) ? 0 : item.share;
                            if (share === 0 && contribution === 0) return '-';
                            
                            let cell = '';
                            if (share > 0) cell += `£${share.toFixed(2)}`;
                            if (contribution > 0) cell += `${cell ? ' | ' : ''}Paid: +£${contribution.toFixed(2)}`;
                            return cell;
                        });

                        csvData.push([
                            row.name,
                            ...matrixCols,
                            (row.spent + row.mileage).toFixed(2),
                            row.shared_cost_share.toFixed(2),
                            row.net.toFixed(2)
                        ]);
                    });

                    downloadCSV(csvData, `settlement-${event.title.replace(/[^a-z0-9]/gi, '_')}.csv`);
                };

                summarySection.innerHTML = Panel({
                    title: 'Financial Settlement',
                    icon: CURRENCY_POUND_SVG,
                    content: `
                        <div class="mb-8">
                            <h4 class="mb-4" style="font-size: 1rem;">1. Shared Cost Calculations</h4>
                            ${tripTablesHtml}
                            ${expenseTablesHtml}
                        </div>

                        <div class="mb-8">
                            <h4 class="mb-4" style="font-size: 1rem;">2. Personal Settlement Matrix</h4>
                            <div class="glass-table-container">
                                <div class="table-responsive">
                                    <table class="glass-table matrix-table">
                                        <thead>${matrixHeaderHtml}</thead>
                                        <tbody>${matrixRowsHtml}</tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div class="summary-footer-actions mt-6 flex justify-end">
                            <div class="button-group" style="gap: 1rem;">
                                <button id="download-settlement-csv-btn" class="secondary outline">Download CSV</button>
                                <button id="release-funds-btn" class="primary" ${event.costs_released ? 'disabled' : ''}>
                                    ${event.costs_released ? 'Funds Released' : 'Release Funds'}
                                </button>
                            </div>
                        </div>

                        ${!event.costs_released ? '<p class="small-text warning-text mt-4"><strong>Note:</strong> Releasing funds will update all attendee balances. This action is final.</p>' : ''}
                    `
                });

                summarySection.querySelector('#download-settlement-csv-btn').onclick = generateSettlementCSV;

                const releaseBtn = summarySection.querySelector('#release-funds-btn');
                if (releaseBtn) {
                    releaseBtn.onclick = async () => {
                        if (!await showConfirmModal('Release Funds?', 'Finalize the budget and update all member balances? This cannot be undone.')) return;
                        try {
                            await apiRequest('POST', `/api/admin/events/${event.id}/release-costs`);
                            notify('Success', 'Funds released successfully.', 'success', 5000, 'admin-finance');
                            
                            // Re-render to hide the button and show the released status
                            switchView(`/admin/event/${event.id}?tab=finance`, true);
                        } catch (e) { notify('Error', e.message, 'error', 5000, 'admin-finance'); }
                    };
                }
            } else { summarySection.classList.add('hidden'); }

        } catch (e) { console.error(e); }
    };

    await loadAllData();
}

// --- Modals (Trips) ---

function openAddParticipantModal(eventId, onSuccess) {
    const modalContent = `
        <div class="modern-form">
            <div class="form-group">
                <label>Search Member</label>
                <input type="text" id="add-attendee-search-input" placeholder="Type name or email..." class="modern-input">
                <div id="add-attendee-results-dropdown" class="glass-panel hidden mt-2" style="max-height: 200px; overflow-y: auto;"></div>
            </div>
        </div>
    `;
    const modal = new Modal({ id: `add-participant-modal-${Date.now()}`, title: 'Add Participant', content: modalContent });
    document.body.insertAdjacentHTML('beforeend', modal.getHTML());
    modal.attachListeners(); modal.show();

    const searchInput = document.getElementById('add-attendee-search-input');
    const resultsDropdown = document.getElementById('add-attendee-results-dropdown');
    let searchTimeout;

    searchInput.oninput = () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            const query = searchInput.value.trim();
            if (query.length < 2) { resultsDropdown.classList.add('hidden'); return; }
            try {
                const res = await apiRequest('GET', `/api/admin/users?search=${encodeURIComponent(query)}&limit=5`);
                const users = res.data || [];
                if (users.length === 0) resultsDropdown.innerHTML = '<p class="small-text p-3">No members found.</p>';
                else {
                    resultsDropdown.innerHTML = users.map(u => `
                        <div class="search-result-item" data-user-id="${u.id}" style="padding: 0.75rem; cursor: pointer; border-bottom: 1px solid rgba(128,128,128,0.1); display: flex; align-items: center; gap: 0.75rem;">
                            ${renderAvatar(u, { classes: 'mini' })}
                            <div>
                                <strong>${u.first_name} ${u.last_name}</strong><br>
                                <small class="muted-text">${u.email}</small>
                            </div>
                        </div>
                    `).join('');
                    resultsDropdown.querySelectorAll('.search-result-item').forEach(item => {
                        item.onclick = async () => {
                            if (!await showConfirmModal('Add?', `Add ${item.querySelector('strong').textContent} to the event?`)) return;
                            try {
                                await apiRequest('POST', `/api/admin/events/${eventId}/attendees`, { userId: item.dataset.userId });
                                notify('Success', 'Added.', 'success', 5000, 'admin-attendee'); modal.close(); onSuccess();
                            } catch (e) { notify('Error', e.message, 'error', 5000, 'admin-attendee'); }
                        };
                    });
                }
                resultsDropdown.classList.remove('hidden');
            } catch (e) { }
        }, 300);
    };
}

function openAddTripModal(eventId, onSuccess) {
    const modalContent = `<form id="add-trip-form" class="modern-form"><label>Trip Name <input type="text" id="trip-name" placeholder="e.g. Drive to Lake" required></label><button type="submit" class="primary full-width">Create Trip</button></form>`;
    const modal = new Modal({ id: `add-trip-modal-${Date.now()}`, title: 'New Trip', content: modalContent });
    document.body.insertAdjacentHTML('beforeend', modal.getHTML());
    modal.attachListeners(); modal.show();
    document.getElementById('add-trip-form').onsubmit = async (e) => {
        e.preventDefault();
        try {
            await apiRequest('POST', `/api/admin/events/${eventId}/trips`, { name: document.getElementById('trip-name').value });
            notify('Success', 'Trip created.', 'success', 5000, 'admin-transport'); modal.close(); onSuccess();
        } catch (err) { notify('Error', err.message, 'error', 5000, 'admin-transport'); }
    };
}

async function openManageDriversModal(eventId, tripId, attendees, onSuccess, isReadOnly = false) {
    const response = await apiRequest('GET', `/api/admin/events/${eventId}/drivers`);
    const drivers = (response.data || []).filter(d => d.trip_id == tripId);

    const modalContent = `
        <div class="header-row mb-4" style="display:flex; justify-content: space-between; align-items:center;">
            <p class="nomargin small-text muted-text">${isReadOnly ? 'View drivers for this trip.' : 'Manage volunteers and manual drivers.'}</p>
            ${!isReadOnly ? `<button type="button" id="admin-add-driver-btn" class="small-btn primary mini-btn">${ADD_SVG} Add Driver</button>` : ''}
        </div>
        <div class="glass-table-container">
            <div class="table-responsive">
                <table class="glass-table">
                    <thead><tr><th>Driver</th><th>Status</th><th>Capacity</th><th>Mileage</th>${!isReadOnly ? '<th class="text-right">Action</th>' : ''}</tr></thead>
                    <tbody>
                        ${drivers.map(d => `
                            <tr>
                                <td data-label="Driver" class="primary-text">
                                    <div class="user-info-cell">
                                        ${renderAvatar(d, { classes: 'mini' })}
                                        <div>
                                            ${d.first_name} ${d.last_name}<br><small class="muted-text">${d.car_name}</small>
                                        </div>
                                    </div>
                                </td>
                                <td data-label="Status"><span class="badge ${d.status}">${d.status}</span></td>
                                <td data-label="Capacity">${d.seats}S / ${d.boats}B</td>
                                <td data-label="Mileage">
                                    <div class="mileage-display">
                                        <span>${d.start_mileage !== null ? d.start_mileage : '-'} / ${d.end_mileage !== null ? d.end_mileage : '-'}</span>
                                        ${!isReadOnly ? `<button class="small-btn icon-only tertiary mini-btn" data-edit-mileage="${d.id}" title="Edit Mileage">${EDIT_SVG}</button>` : ''}
                                    </div>
                                    ${d.start_mileage_proof_id ? `<a href="/api/files/${d.start_mileage_proof_id}/download?view=true" target="_blank" class="small-text">S-Proof</a>` : ''}
                                    ${d.end_mileage_proof_id ? `<a href="/api/files/${d.end_mileage_proof_id}/download?view=true" target="_blank" class="small-text">E-Proof</a>` : ''}
                                </td>
                                ${!isReadOnly ? `
                                <td data-label="Action" class="text-right">
                                    <div class="button-group mini justify-end">
                                        <button class="small-btn success icon-only" data-driver-status="accepted" data-id="${d.id}" title="Accept">${CHECK_SVG}</button>
                                        <button class="small-btn warning icon-only" data-driver-status="declined" data-id="${d.id}" title="Decline">${CLOSE_SVG}</button>
                                        <button class="small-btn delete icon-only" data-remove-driver="${d.id}" title="Remove Driver">${DELETE_SVG}</button>
                                    </div>
                                </td>` : ''}
                            </tr>
                        `).join('') || '<tr><td colspan="${isReadOnly ? 4 : 5}" class="empty-cell">No drivers for this trip.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    const modal = new Modal({ id: `manage-drivers-modal-${Date.now()}`, title: isReadOnly ? 'View Drivers' : 'Manage Drivers', content: modalContent, contentClasses: 'modal-lg' });
    document.body.insertAdjacentHTML('beforeend', modal.getHTML());
    modal.attachListeners(); modal.show();

    const addDriverBtn = modal.element.querySelector('#admin-add-driver-btn');
    if (addDriverBtn) addDriverBtn.onclick = () => openAddDriverModal(tripId, attendees, () => { modal.close(); openManageDriversModal(eventId, tripId, attendees, onSuccess, isReadOnly); });

    modal.element.querySelectorAll('[data-driver-status]').forEach(btn => {
        btn.onclick = async () => {
            try {
                await apiRequest('POST', `/api/admin/drivers/${btn.dataset.id}/status`, { status: btn.dataset.driverStatus });
                notify('Success', `Driver marked as ${btn.dataset.driverStatus}.`, 'success', 5000, 'admin-transport');
                modal.close(); openManageDriversModal(eventId, tripId, attendees, onSuccess, isReadOnly); onSuccess();
            } catch (e) { notify('Error', e.message, 'error', 5000, 'admin-transport'); }
        };
    });

    modal.element.querySelectorAll('[data-remove-driver]').forEach(btn => {
        btn.onclick = async () => {
            if (!await showConfirmModal('Remove Driver?', 'Are you sure you want to remove this driver from the trip?')) return;
            try {
                await apiRequest('DELETE', `/api/admin/drivers/${btn.dataset.removeDriver}`);
                notify('Success', 'Driver removed.', 'success', 5000, 'admin-transport');
                modal.close(); openManageDriversModal(eventId, tripId, attendees, onSuccess, isReadOnly); onSuccess();
            } catch (e) { notify('Error', e.message, 'error', 5000, 'admin-transport'); }
        };
    });

    modal.element.querySelectorAll('[data-edit-mileage]').forEach(btn => {
        btn.onclick = () => {
            const driver = drivers.find(d => d.id == btn.dataset.editMileage);
            openEditMileageModal(driver, () => { modal.close(); openManageDriversModal(eventId, tripId, attendees, onSuccess, isReadOnly); onSuccess(); });
        };
    });
}

function openAddDriverModal(tripId, attendees, onSuccess) {
    const modalContent = `
        <form id="add-driver-form" class="modern-form">
            <label>Driver
                <select id="driver-user-id" required>
                    <option value="" disabled selected>Select attendee</option>
                    ${attendees.map(a => `<option value="${a.id}">${a.first_name} ${a.last_name}</option>`).join('')}
                </select>
            </label>
            <label>Car
                <select id="driver-car-id" required disabled>
                    <option value="" disabled selected>Select user first</option>
                </select>
            </label>
            <button type="submit" class="primary full-width" disabled id="add-driver-submit">Add Driver</button>
        </form>
    `;
    const modal = new Modal({ id: `add-driver-modal-${Date.now()}`, title: 'Add Driver', content: modalContent });
    document.body.insertAdjacentHTML('beforeend', modal.getHTML());
    modal.attachListeners(); modal.show();

    const userSelect = document.getElementById('driver-user-id');
    const carSelect = document.getElementById('driver-car-id');
    const submitBtn = document.getElementById('add-driver-submit');

    userSelect.onchange = async () => {
        const userId = userSelect.value;
        carSelect.disabled = true;
        carSelect.innerHTML = '<option value="" disabled selected>Loading cars...</option>';
        try {
            const carsRes = await apiRequest('GET', `/api/cars?userId=${userId}`);
            const cars = carsRes.data || [];
            carSelect.innerHTML = cars.map(c => `<option value="${c.id}">${c.name} (${c.seats}S / ${c.boats}B)</option>`).join('') || '<option value="" disabled>No cars found for user</option>';
            carSelect.disabled = cars.length === 0;
            submitBtn.disabled = cars.length === 0;
        } catch (e) { carSelect.innerHTML = '<option value="" disabled>Error loading cars</option>'; }
    };

    document.getElementById('add-driver-form').onsubmit = async (e) => {
        e.preventDefault();
        try {
            await apiRequest('POST', `/api/admin/trips/${tripId}/drivers`, { userId: userSelect.value, carId: carSelect.value });
            notify('Success', 'Driver added.', 'success', 5000, 'admin-transport'); modal.close(); onSuccess();
        } catch (err) { notify('Error', err.message, 'error', 5000, 'admin-transport'); }
    };
}

function openEditMileageModal(driver, onSuccess) {
    const modalContent = `
        <form id="edit-mileage-form" class="modern-form">
            <label>Start Mileage
                <input type="number" id="edit-start-mileage" value="${driver.start_mileage || ''}" placeholder="0">
            </label>
            <label>End Mileage
                <input type="number" id="edit-end-mileage" value="${driver.end_mileage || ''}" placeholder="0">
            </label>
            <p class="small-text muted-text">Manual edits do not require proof images.</p>
            <button type="submit" class="primary full-width">Save Mileage</button>
        </form>
    `;
    const modal = new Modal({ id: `edit-mileage-modal-${Date.now()}`, title: `Edit Mileage: ${driver.first_name}`, content: modalContent });
    document.body.insertAdjacentHTML('beforeend', modal.getHTML());
    modal.attachListeners(); modal.show();

    setupNumberInput(document.getElementById('edit-start-mileage'));
    setupNumberInput(document.getElementById('edit-end-mileage'));

    document.getElementById('edit-mileage-form').onsubmit = async (e) => {
        e.preventDefault();
        const start = document.getElementById('edit-start-mileage').value;
        const end = document.getElementById('edit-end-mileage').value;
        try {
            await apiRequest('POST', `/api/admin/drivers/${driver.id}/mileage`, { startMileage: start, endMileage: end });
            notify('Success', 'Mileage updated.', 'success', 5000, 'admin-transport'); modal.close(); onSuccess();
        } catch (err) { notify('Error', err.message, 'error', 5000, 'admin-transport'); }
    };
}

// --- Modals (Expenses) ---

function openAddExpenseModal(eventId, attendees, onSuccess) {
    const modalContent = `
        <form id="add-expense-form" class="modern-form">
            <label>Payer
                <select id="expense-user-id" required>
                    <option value="" disabled selected>Select attendee</option>
                    ${attendees.map(a => `<option value="${a.id}">${a.first_name} ${a.last_name}</option>`).join('')}
                </select>
            </label>
            <label>Amount (£)
                <input type="number" id="expense-amount" step="0.01" placeholder="0.00" required>
            </label>
            <label>Description
                <input type="text" id="expense-description" placeholder="e.g. Petrol, Entry fee" required>
            </label>
            <button type="submit" class="primary full-width">Add Expense</button>
        </form>
    `;
    const modal = new Modal({ id: `add-expense-modal-${Date.now()}`, title: 'Add Expense', content: modalContent });
    document.body.insertAdjacentHTML('beforeend', modal.getHTML());
    modal.attachListeners(); modal.show();

    setupNumberInput(document.getElementById('expense-amount'));

    document.getElementById('add-expense-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            userId: document.getElementById('expense-user-id').value,
            amount: document.getElementById('expense-amount').value,
            description: document.getElementById('expense-description').value
        };
        try {
            await apiRequest('POST', `/api/admin/events/${eventId}/expenses`, data);
            notify('Success', 'Expense added.', 'success', 5000, 'admin-finance'); modal.close(); onSuccess();
        } catch (err) { notify('Error', err.message, 'error', 5000, 'admin-finance'); }
    };
}

export async function openExclusionsModal(type, id, attendees, onSuccess) {
    const currentExclusions = await apiRequest('GET', `/api/admin/${type}s/${id}/exclusions`);
    const excludedIds = currentExclusions.data || [];

    const modalContent = `
        <p class="small-text mb-4">Select people who should <strong>not</strong> pay for this ${type}.</p>
        <form id="exclusions-form" class="modern-form">
            <div class="exclusions-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; max-height: 300px; overflow-y: auto;">
                ${attendees.map(a => `
                    <label class="checkbox-label">
                        <input type="checkbox" name="userIds" value="${a.id}" ${excludedIds.includes(a.id) ? 'checked' : ''}>
                        ${a.first_name} ${a.last_name}
                    </label>
                `).join('')}
            </div>
            <button type="submit" class="primary full-width mt-4">Save Exclusions</button>
        </form>
    `;
    const modal = new Modal({ id: `exclusions-modal-${Date.now()}`, title: `Manage ${type} Exclusions`, content: modalContent });
    document.body.insertAdjacentHTML('beforeend', modal.getHTML());
    modal.attachListeners(); modal.show();

    document.getElementById('exclusions-form').onsubmit = async (e) => {
        e.preventDefault();
        const userIds = Array.from(new FormData(e.target).getAll('userIds')).map(id => parseInt(id));
        try {
            await apiRequest('POST', `/api/admin/${type}s/${id}/exclusions`, { userIds });
            notify('Success', 'Exclusions updated.', 'success', 5000, 'admin-finance'); modal.close(); onSuccess();
        } catch (err) { notify('Error', err.message, 'error', 5000, 'admin-finance'); }
    };
}
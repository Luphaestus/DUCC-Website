import { apiRequest } from '/js/utils/api.js';
import { ViewChangedEvent, addRoute, switchView } from '/js/utils/view.js';
import { downloadCSV } from '/js/utils/utils.js';
import { CURRENCY_POUND_SVG, TRIP_SVG, WALLET_SVG } from '../../images/icons/outline/icons.js';
import { Modal } from '/js/widgets/Modal.js';

const view_id = 'settlement-view';
addRoute('/event/:id/settlement', 'settlement', { isOverlay: true });

const modal = new Modal({
    id: view_id,
    isView: true,
    contentClasses: 'modal-lg glass-panel',
    contentId: 'settlement-detail',
    content: '<p aria-busy="true">Loading settlement...</p>',
    fallbackPath: (path) => {
        const eventId = path?.split('/')[2];
        return eventId ? `/event/${eventId}` : '/events';
    }
});

const HTML_TEMPLATE = modal.getHTML();

async function renderSettlement(container, eventId) {
    try {
        const [eventRes, settlementRes] = await Promise.all([
            apiRequest('GET', `/api/event/${eventId}`),
            apiRequest('GET', `/api/events/${eventId}/settlement`)
        ]);

        const event = eventRes.event;
        const summary = settlementRes.data;

        if (!summary) {
            container.innerHTML = `<div class="p-8 text-center"><p class="muted-text">Settlement data not available.</p></div>`;
            return;
        }

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

        const matrixHeaderHtml = `
            <tr>
                <th>Member</th>
                ${costItems.map(item => `<th class="text-center" title="${item.type}: ${item.name}">${item.name}</th>`).join('')}
                <th class="text-right">Total Contributed</th>
                <th class="text-right">Total Share</th>
                <th class="text-right">Net Change</th>
            </tr>
        `;

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
            csvData.push([`Financial Settlement for ${event.title}`]);
            const releaseTime = summary.released_at ? new Date(summary.released_at).toLocaleString() : 'Not Yet Finalized';
            csvData.push([`Finalized at: ${releaseTime}`]);
            csvData.push([]);

            csvData.push(['1. SHARED COST CALCULATIONS: TRIPS']);
            (summary.trips || []).forEach(trip => {
                csvData.push([`Trip: ${trip.name}`, `Total: £${trip.total_reimbursement.toFixed(2)}`, `Share: £${trip.share.toFixed(2)} each`, `${trip.eligible_count} Payers`]);
                csvData.push(['Driver', 'Miles', 'Cost']);
                trip.drivers.forEach(d => csvData.push([d.name, d.miles, d.reimbursement.toFixed(2)]));
                csvData.push([]);
            });

            csvData.push(['2. SHARED COST CALCULATIONS: OTHER EXPENSES']);
            (summary.expenses || []).forEach(e => {
                csvData.push([`Expense: ${e.description}`, `Total: £${e.amount.toFixed(2)}`, `Share: £${e.share.toFixed(2)} each`, `${e.eligible_count} Payers`]);
                csvData.push(['Payer', 'Description', 'Amount']);
                csvData.push([e.payer_name, e.description, e.amount.toFixed(2)]);
                csvData.push([]);
            });

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
                csvData.push([row.name, ...matrixCols, (row.spent + row.mileage).toFixed(2), row.shared_cost_share.toFixed(2), row.net.toFixed(2)]);
            });

            downloadCSV(csvData, `settlement-${event.title.replace(/[^a-z0-9]/gi, '_')}.csv`);
        };

        container.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between align-center mb-6">
                    <h2 class="nomargin">${CURRENCY_POUND_SVG} Financial Settlement: ${event.title}</h2>
                </div>

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

                <div class="mt-6 flex justify-end">
                    <button id="download-settlement-csv-btn" class="secondary outline">Download CSV</button>
                </div>
            </div>
        `;

        container.querySelector('#download-settlement-csv-btn').onclick = generateSettlementCSV;

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="p-8 text-center"><p class="text-error">Failed to load settlement: ${error.message}</p></div>`;
    }
}

ViewChangedEvent.subscribe(({ viewId, path }) => {
    if (viewId === 'settlement') {
        const eventId = path.split('/')[2];
        const container = document.getElementById('settlement-detail');
        if (container) renderSettlement(container, eventId);
    }
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);
modal.attachListeners();

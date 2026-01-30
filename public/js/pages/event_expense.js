/**
 * event_expense.js
 * 
 * Logic for reporting and editing event expenses.
 * 
 * Registered Routes: /event/:eventId/expense/new, /event/:eventId/expense/:expenseId/edit
 */

import { apiRequest } from '/js/utils/api.js';
import { ViewChangedEvent, addRoute } from '/js/utils/view.js';
import { Modal } from '/js/widgets/Modal.js';
import { UploadWidget } from '/js/widgets/upload/UploadWidget.js';
import { setupNumberInput } from '/js/utils/utils.js';
import { notify } from '../components/notification.js';
import { EventAttendanceChangedEvent } from '/js/utils/events/events.js';

addRoute('/event/:eventId/expense/new', 'event-expense', { isOverlay: true });
addRoute('/event/:eventId/expense/:expenseId/edit', 'event-expense', { isOverlay: true });
addRoute('/event/:eventId/driver/:driverId/mileage/:type', 'event-mileage', { isOverlay: true });

const expenseModal = new Modal({
    id: 'event-expense-view',
    isView: true,
    title: 'Report Event Expense',
    contentClasses: 'modal-lg glass-panel',
    contentId: 'event-expense-content',
    fallbackPath: () => window.location.pathname.split('/expense')[0] || '/events'
});

const mileageModal = new Modal({
    id: 'event-mileage-view',
    isView: true,
    title: 'Submit Mileage',
    contentClasses: 'modal-lg glass-panel',
    contentId: 'event-mileage-content',
    fallbackPath: () => window.location.pathname.split('/driver')[0] || '/events'
});

const HTML_TEMPLATE = expenseModal.getHTML() + mileageModal.getHTML();

/**
 * Listener for route changes to handle expense reporting/editing and mileage submission.
 */
async function NavigationEventListner({ viewId, path }) {
    if (viewId === "event-expense") {
        await renderExpenseView(path);
    } else if (viewId === "event-mileage") {
        await renderMileageView(path);
    }
}

async function renderExpenseView(path) {
    const container = document.getElementById('event-expense-content');
    if (!container) return;

    const urlParts = path.split('?')[0].split('/');
    const eventId = urlParts[2];
    const isEdit = path.includes('/edit');
    const expenseId = isEdit ? urlParts[4] : null;

    const title = isEdit ? 'Edit Event Expense' : 'Report Event Expense';
    const headerH2 = document.querySelector('#event-expense-view .c-modal-header h2');
    if (headerH2) headerH2.textContent = title;

    let expense = null;
    if (isEdit) {
        container.innerHTML = '<p aria-busy="true">Loading expense details...</p>';
        try {
            const res = await apiRequest('GET', `/api/events/${eventId}/expenses`);
            expense = (res.data || []).find(e => e.id == expenseId);
            if (!expense) throw new Error('Expense not found');
        } catch (e) {
            container.innerHTML = `<p class="error-text">Error: ${e.message}</p>`;
            return;
        }
    }

    let uploadedFileId = expense ? expense.receipt_file_id : null;

    container.innerHTML = /*html*/`
        <form id="expense-view-form" class="modern-form">
            <div class="form-group mb-4">
                <label for="expense-view-amount">Amount (£)</label>
                <input type="number" id="expense-view-amount" step="0.01" value="${expense ? expense.amount : ''}" required placeholder="0.00">
            </div>
            <div class="form-group mb-4">
                <label for="expense-view-desc">Description</label>
                <input type="text" id="expense-view-desc" placeholder="e.g. Group Dinner" value="${expense ? expense.description : ''}" required>
            </div>
            <div class="form-group mb-4">
                <label>Receipt (Optional)</label>
                <div id="expense-view-upload-container"></div>
            </div>
            <div class="form-actions mt-6">
                <button type="submit" class="primary full-width">${isEdit ? 'Update Expense' : 'Report Expense'}</button>
            </div>
        </form>
    `;

    setupNumberInput(document.getElementById('expense-view-amount'));

    const widget = new UploadWidget(container.querySelector('#expense-view-upload-container'), {
        mode: 'inline',
        selectMode: 'single',
        autoUpload: true,
        defaultPreview: uploadedFileId ? `/api/files/${uploadedFileId}/download?view=true` : null,
        onImageSelect: ({ id }) => { uploadedFileId = id; }
    });

    document.getElementById('expense-view-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            amount: document.getElementById('expense-view-amount').value,
            description: document.getElementById('expense-view-desc').value,
            receiptFileId: uploadedFileId
        };

        try {
            if (isEdit) {
                await apiRequest('PUT', `/api/expenses/${expenseId}`, data);
                notify('Success', 'Expense updated.', 'success');
            } else {
                await apiRequest('POST', `/api/events/${eventId}/expenses`, data);
                notify('Success', 'Expense reported.', 'success');
            }
            expenseModal.close();
            EventAttendanceChangedEvent.notify({ eventId });
        } catch (err) {
            notify('Error', err.message || 'Failed to save expense.', 'error');
        }
    };
}

async function renderMileageView(path) {
    const container = document.getElementById('event-mileage-content');
    if (!container) return;

    const urlParts = path.split('?')[0].split('/');
    const eventId = urlParts[2];
    const driverId = urlParts[4];
    const type = urlParts[6];

    const title = `Submit ${type === 'start' ? 'Starting' : 'Ending'} Mileage`;
    const headerH2 = document.querySelector('#event-mileage-view .c-modal-header h2');
    if (headerH2) headerH2.textContent = title;

    container.innerHTML = '<p aria-busy="true">Loading mileage details...</p>';

    let currentMileage = '';
    let uploadedFileId = null;

    try {
        const res = await apiRequest('GET', `/api/drivers/${driverId}`);
        const driver = res.data;
        if (type === 'start') {
            currentMileage = driver.start_mileage ?? '';
            uploadedFileId = driver.start_mileage_proof_id;
        } else {
            currentMileage = driver.end_mileage ?? '';
            uploadedFileId = driver.end_mileage_proof_id;
        }
    } catch (e) {
        console.error("Failed to fetch driver details", e);
    }

    container.innerHTML = /*html*/`
        <form id="mileage-view-form" class="modern-form">
            <div class="form-group mb-4">
                <label for="mileage-view-input">Current Mileage</label>
                <input type="number" id="mileage-view-input" step="0.1" value="${currentMileage}" required placeholder="0.0">
            </div>
            <div class="form-group mb-4">
                <label>Photo Proof (Odometer)</label>
                <div id="mileage-view-upload-container"></div>
            </div>
            <div class="form-actions mt-6">
                <button type="submit" class="primary full-width">Submit Mileage</button>
            </div>
        </form>
    `;

    setupNumberInput(document.getElementById('mileage-view-input'));

    const widget = new UploadWidget(container.querySelector('#mileage-view-upload-container'), {
        mode: 'inline',
        selectMode: 'single',
        autoUpload: true,
        enableLibrary: false,
        enableUrl: false,
        defaultPreview: uploadedFileId ? `/api/files/${uploadedFileId}/download?view=true` : null,
        onImageSelect: ({ id }) => { uploadedFileId = id; }
    });

    document.getElementById('mileage-view-form').onsubmit = async (e) => {
        e.preventDefault();
        if (!uploadedFileId) return notify('Error', 'Please upload a photo of your odometer.', 'error');

        try {
            await apiRequest('POST', `/api/drivers/${driverId}/mileage`, {
                type,
                mileage: document.getElementById('mileage-view-input').value,
                proofId: uploadedFileId
            });
            notify('Success', 'Mileage submitted.', 'success');
            mileageModal.close();
            EventAttendanceChangedEvent.notify({ eventId });
        } catch (err) {
            notify('Error', err.message || 'Failed to submit mileage.', 'error');
        }
    };
}

ViewChangedEvent.subscribe(NavigationEventListner);
document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);
expenseModal.attachListeners();
mileageModal.attachListeners();

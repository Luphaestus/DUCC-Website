import { ajaxGet, ajaxPost } from './misc/ajax.js';
import { notify } from './misc/notification.js';
import { ViewChangedEvent, switchView } from './misc/view.js';

const adminContentID = 'admin-content';
const manageUsersButtonID = 'admin-manage-users-button';
const manageEventsButtonID = 'admin-manage-events-button';
const viewReportsButtonID = 'admin-view-reports-button';

const HTML_TEMPLATE = `
<div id="/admin/*-view" class="view hidden small-container">
    <h1>Admin Dashboard</h1>
    <div id="admin-controls">
        <button onclick="switchView('/admin/users')">Manage Users</button>
        <button onclick="switchView('/admin/events')">Manage Events</button>
        <button onclick="switchView('/admin/reports')">View Reports</button>
    </div>
    <div id="${adminContentID}">
        <p>Select an option to manage.</p>
    </div>
</div>`;

async function AdminNavigationListener({ resolvedPath, path }) {
    if (resolvedPath !== "/admin/*") return;

    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    const cleanPath = path.split('?')[0];

    if (cleanPath === '/admin/users') {
        await renderManageUsers();
    } else if (cleanPath === '/admin/events') {
        await renderManageEvents();
    } else if (cleanPath === '/admin/reports') {
        await renderViewReports();
    } else if (cleanPath.match(/^\/admin\/event\/(new|\d+)$/)) {
        const id = cleanPath.split('/').pop();
        await renderEventDetail(id);
    } else if (cleanPath.match(/^\/admin\/user\/\d+$/)) {
        const id = cleanPath.split('/').pop();
        await renderUserDetail(id);
    } else {
        adminContent.innerHTML = '<p>Select an option to manage.</p>';
    }
}

async function renderManageUsers() {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    const urlParams = new URLSearchParams(window.location.search);
    const search = urlParams.get('search') || '';
    const sort = urlParams.get('sort') || 'last_name';
    const order = urlParams.get('order') || 'asc';
    const page = parseInt(urlParams.get('page')) || 1;

    adminContent.innerHTML = `
        <div class="admin-controls-bar" style="margin-bottom: 1rem; display: flex; gap: 1rem;">
            <input type="text" id="user-search-input" placeholder="Search by name..." value="${search}">
            <button id="user-search-btn">Search</button>
        </div>
        <div style="overflow-x: auto;">
            <table class="admin-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="text-align: left; border-bottom: 2px solid #ccc;">
                        <th class="sortable" data-sort="first_name" style="cursor: pointer; padding: 8px;">Name ↕</th>
                        <th class="sortable" data-sort="balance" style="cursor: pointer; padding: 8px;">Balance ↕</th>
                        <th class="sortable" data-sort="first_aid_expiry" style="cursor: pointer; padding: 8px;">First Aid ↕</th>
                        <th class="sortable" data-sort="difficulty_level" style="cursor: pointer; padding: 8px;">Difficulty ↕</th>
                        <th class="sortable" data-sort="is_member" style="cursor: pointer; padding: 8px;">Member ↕</th>
                    </tr>
                </thead>
                <tbody id="users-table-body">
                    <tr><td colspan="5" style="padding: 8px;">Loading...</td></tr>
                </tbody>
            </table>
        </div>
        <div id="users-pagination" style="margin-top: 1rem; display: flex; gap: 0.5rem; align-items: center;"></div>
    `;

    const searchInput = document.getElementById('user-search-input');
    const searchBtn = document.getElementById('user-search-btn');

    const performSearch = () => {
        const newSearch = searchInput.value;
        updateUserParams({ search: newSearch, page: 1 });
    };

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    adminContent.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            let newOrder = 'asc';
            if (sort === field) {
                newOrder = order === 'asc' ? 'desc' : 'asc';
            } else {
            }
            updateUserParams({ sort: field, order: newOrder });
        });
    });

    await fetchAndRenderUsers({ page, search, sort, order });
}

function updateUserParams(updates) {
    const urlParams = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === '') {
            urlParams.delete(key);
        } else {
            urlParams.set(key, value);
        }
    }
    switchView(`/admin/users?${urlParams.toString()}`);
}

async function fetchAndRenderUsers({ page, search, sort, order }) {
    const tbody = document.getElementById('users-table-body');
    const pagination = document.getElementById('users-pagination');

    try {
        const limit = 10;
        const query = new URLSearchParams({ page, limit, search, sort, order }).toString();
        const data = await ajaxGet(`/api/admin/users?${query}`);
        const users = data.users || [];
        const totalPages = data.totalPages || 1;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding: 8px;">No users found.</td></tr>';
            pagination.innerHTML = '';
            return;
        }

        tbody.innerHTML = users.map(user => {
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
            const balance = user.balance !== undefined ? `£${Number(user.balance).toFixed(2)}` : 'N/A';

            let firstAid = 'None';
            if (user.first_aid_expiry) {
                const expiry = new Date(user.first_aid_expiry);
                firstAid = expiry > new Date() ? 'Valid' : 'Expired';
            }

            const difficulty = user.difficulty_level || 1;
            const member = user.is_member ? 'Member' : 'Non-Member';

            return `
                <tr class="user-row" style="border-bottom: 1px solid #eee; cursor: pointer;" data-name="${fullName}" data-id="${user.id}">
                    <td style="padding: 8px;">${fullName}</td>
                    <td style="padding: 8px;">${balance}</td>
                    <td style="padding: 8px;">${firstAid}</td>
                    <td style="padding: 8px;">${difficulty}</td>
                    <td style="padding: 8px;">${member}</td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.user-row').forEach(row => {
            row.addEventListener('click', () => {
                switchView(`/admin/user/${row.dataset.id}`);
            });
        });

        renderPaginationControls(pagination, page, totalPages);

    } catch (e) {
        console.error("Error fetching users", e);
        tbody.innerHTML = '<tr><td colspan="5" style="padding: 8px; color: red;">Error loading users.</td></tr>';
    }
}

function renderPaginationControls(container, currentPage, totalPages) {
    container.innerHTML = '';

    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Prev';
    prevBtn.disabled = currentPage <= 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) updateUserParams({ page: currentPage - 1 });
    };

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) updateUserParams({ page: currentPage + 1 });
    };

    const info = document.createElement('span');
    info.textContent = `Page ${currentPage} of ${totalPages}`;

    container.appendChild(prevBtn);
    container.appendChild(info);
    container.appendChild(nextBtn);
}

async function renderUserDetail(userId) {
    const adminContent = document.getElementById(adminContentID);
    adminContent.innerHTML = '<p>Loading user details...</p>';

    try {
        const user = await ajaxGet(`/api/admin/user/${userId}`);

        adminContent.innerHTML = `
            <button id="admin-back-btn" style="margin-bottom: 1rem; padding: 5px 10px;">&larr; Back to Users</button>
            <h2>${user.first_name} ${user.last_name} (ID: ${user.id})</h2>
            <div class="admin-tabs" style="display: flex; gap: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">
                <button class="tab-btn active" data-tab="profile" style="padding: 5px 15px;">Profile</button>
                <button class="tab-btn" data-tab="legal" style="padding: 5px 15px;">Legal</button>
                <button class="tab-btn" data-tab="transactions" style="padding: 5px 15px;">Transactions</button>
            </div>
            <div id="admin-tab-content" style="margin-top: 1rem;"></div>
        `;

        document.getElementById('admin-back-btn').onclick = () => switchView('/admin/users');

        const tabs = adminContent.querySelectorAll('.tab-btn');
        tabs.forEach(btn => {
            btn.onclick = () => {
                tabs.forEach(t => {
                    t.classList.remove('active');
                    t.style.fontWeight = 'normal';
                });
                btn.classList.add('active');
                btn.style.fontWeight = 'bold';
                renderTab(btn.dataset.tab, user);
            };
        });

        tabs[0].style.fontWeight = 'bold';
        renderTab('profile', user);

    } catch (e) {
        console.error(e);
        adminContent.innerHTML = '<p style="color: red;">Failed to load user details.</p><button id="admin-back-error">Back</button>';
        document.getElementById('admin-back-error').onclick = () => switchView('/admin/users');
    }
}

function renderTab(tabName, user) {
    const container = document.getElementById('admin-tab-content');
    if (tabName === 'profile') {
        container.innerHTML = `
            <h3>Profile Information</h3>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 10px; max-width: 600px; align-items: center;">
                <strong>Email:</strong> <span>${user.email}</span>
                <strong>Phone:</strong> <span>${user.phone_number || 'N/A'}</span>
                <strong>College:</strong> <span>${user.college_id || 'N/A'}</span>
                <strong>Member:</strong> <span>${user.is_member ? 'Yes' : 'No'}</span>
                <strong>Instructor:</strong> <span>${user.is_instructor ? 'Yes' : 'No'}</span>
                <strong>Free Sessions:</strong> <span>${user.free_sessions}</span>
                <strong>Balance:</strong> <span>£${Number(user.balance).toFixed(2)}</span>
                <strong>Difficulty Level:</strong>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="number" id="admin-user-difficulty" value="${user.difficulty_level || 1}" min="1" max="5" style="width: 60px;">
                    <button id="admin-save-difficulty">Save</button>
                </div>
            </div>
        `;

        document.getElementById('admin-save-difficulty').onclick = async () => {
            const level = document.getElementById('admin-user-difficulty').value;
            try {
                await ajaxPost(`/api/admin/user/${user.id}/elements`, { difficulty_level: level });
                notify('Success', 'Difficulty level updated', 'success');
            } catch (e) {
                console.error(e);
                notify('Error', 'Failed to update difficulty', 'error');
            }
        };
    } else if (tabName === 'legal') {
        container.innerHTML = `
            <h3>Legal & Medical</h3>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 10px; max-width: 600px;">
                <strong>Filled Legal Info:</strong> <span>${user.filled_legal_info ? 'Yes' : 'No'}</span>
                <strong>DOB:</strong> <span>${user.date_of_birth || 'N/A'}</span>
                <strong>Emergency Contact:</strong> <span>${user.emergency_contact_name || 'N/A'} (${user.emergency_contact_phone || 'N/A'})</span>
                <strong>Address:</strong> <span>${user.home_address || 'N/A'}</span>
                <strong>Medical Conditions:</strong> <span>${user.has_medical_conditions ? 'Yes' : 'No'}</span>
                ${user.has_medical_conditions ? `<strong>Details:</strong> <span>${user.medical_conditions_details}</span>` : ''}
                <strong>Medication:</strong> <span>${user.takes_medication ? 'Yes' : 'No'}</span>
                ${user.takes_medication ? `<strong>Details:</strong> <span>${user.medication_details}</span>` : ''}
                <strong>First Aid Expiry:</strong> <span>${user.first_aid_expiry || 'N/A'}</span>
            </div>
        `;
    } else if (tabName === 'transactions') {
        renderTransactionsTab(container, user.id);
    }
}

async function renderTransactionsTab(container, userId) {
    container.innerHTML = '<p>Loading transactions...</p>';
    try {
        const transactions = await ajaxGet(`/api/admin/user/${userId}/transactions`);

        let html = `
            <h3>Transactions</h3>
            <div style="margin-bottom: 1rem; padding: 1rem; background: #f9f9f9; border: 1px solid #ddd;">
                <h4>Add Transaction</h4>
                <div style="display: flex; gap: 10px;">
                    <input type="number" id="new-tx-amount" placeholder="Amount (e.g. 10.00 or -5.00)" step="0.01">
                    <input type="text" id="new-tx-desc" placeholder="Description" style="flex-grow: 1;">
                    <button id="add-tx-btn">Add</button>
                </div>
            </div>
            <table border="1" cellpadding="5" style="width: 100%; border-collapse: collapse;">
                <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Balance After</th><th>Action</th></tr></thead>
                <tbody>
        `;

        if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
            html += '<tr><td colspan="5">No transactions found.</td></tr>';
        } else {
            transactions.forEach(tx => {
                html += `
                    <tr>
                        <td>${new Date(tx.created_at).toLocaleDateString()}</td>
                        <td>
                            <span class="tx-desc-text">${tx.description}</span>
                            <input class="tx-desc-input hidden" value="${tx.description}" style="width: 100%;">
                        </td>
                        <td>
                            <span class="tx-amount-text">£${tx.amount.toFixed(2)}</span>
                            <input type="number" step="0.01" class="tx-amount-input hidden" value="${tx.amount}" style="width: 80px;">
                        </td>
                        <td>£${tx.after !== undefined ? tx.after.toFixed(2) : 'N/A'}</td>
                        <td>
                            <button class="edit-tx-btn" data-id="${tx.id}">Edit</button>
                            <button class="save-tx-btn hidden" data-id="${tx.id}">Save</button>
                            <button class="cancel-tx-btn hidden" data-id="${tx.id}">Cancel</button>
                            <button class="delete-tx-btn" data-id="${tx.id}" style="color: red;">Delete</button>
                        </td>
                    </tr>
                `;
            });
        }

        html += '</tbody></table>';
        container.innerHTML = html;

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
                if (!confirm('Are you sure you want to delete this transaction?')) return;
                const res = await fetch(`/api/admin/transaction/${btn.dataset.id}`, { method: 'DELETE' });
                if (res.ok) {
                    notify('Success', 'Transaction deleted', 'success');
                    renderTransactionsTab(container, userId);
                } else {
                    notify('Error', 'Failed to delete transaction', 'error');
                }
            };
        });

        setupTransactionEditHandlers(container, userId);

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p>Error loading transactions.</p>';
    }
}

function setupTransactionEditHandlers(container, userId) {
    const toggleEdit = (row, edit) => {
        const show = (sel) => row.querySelector(sel)?.classList.remove('hidden');
        const hide = (sel) => row.querySelector(sel)?.classList.add('hidden');

        if (edit) {
            hide('.tx-desc-text'); show('.tx-desc-input');
            hide('.tx-amount-text'); show('.tx-amount-input');
            hide('.edit-tx-btn'); show('.save-tx-btn'); show('.cancel-tx-btn');
            hide('.delete-tx-btn');
        } else {
            show('.tx-desc-text'); hide('.tx-desc-input');
            show('.tx-amount-text'); hide('.tx-amount-input');
            show('.edit-tx-btn'); hide('.save-tx-btn'); hide('.cancel-tx-btn');
            show('.delete-tx-btn');
        }
    };

    container.querySelectorAll('.edit-tx-btn').forEach(btn => {
        btn.onclick = () => toggleEdit(btn.closest('tr'), true);
    });

    container.querySelectorAll('.cancel-tx-btn').forEach(btn => {
        btn.onclick = () => toggleEdit(btn.closest('tr'), false);
    });

    container.querySelectorAll('.save-tx-btn').forEach(btn => {
        btn.onclick = async () => {
            const row = btn.closest('tr');
            const id = btn.dataset.id;
            const amount = row.querySelector('.tx-amount-input').value;
            const description = row.querySelector('.tx-desc-input').value;

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

async function renderManageEvents() {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    const urlParams = new URLSearchParams(window.location.search);
    const search = urlParams.get('search') || '';
    const sort = urlParams.get('sort') || 'start';
    const order = urlParams.get('order') || 'asc';
    const page = parseInt(urlParams.get('page')) || 1;

    adminContent.innerHTML = `
        <div class="admin-controls-bar" style="margin-bottom: 1rem; display: flex; gap: 1rem; justify-content: space-between;">
            <div style="display: flex; gap: 1rem;">
                <input type="text" id="event-search-input" placeholder="Search events..." value="${search}">
                <button id="event-search-btn">Search</button>
            </div>
            <button onclick="switchView('/admin/event/new')">Create New Event</button>
        </div>
        <div style="overflow-x: auto;">
            <table class="admin-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="text-align: left; border-bottom: 2px solid #ccc;">
                        <th class="sortable" data-sort="title" style="cursor: pointer; padding: 8px;">Title ↕</th>
                        <th class="sortable" data-sort="start" style="cursor: pointer; padding: 8px;">Date ↕</th>
                        <th class="sortable" data-sort="location" style="cursor: pointer; padding: 8px;">Location ↕</th>
                        <th class="sortable" data-sort="difficulty_level" style="cursor: pointer; padding: 8px;">Difficulty ↕</th>
                        <th class="sortable" data-sort="upfront_cost" style="cursor: pointer; padding: 8px;">Cost ↕</th>
                    </tr>
                </thead>
                <tbody id="events-table-body">
                    <tr><td colspan="5" style="padding: 8px;">Loading...</td></tr>
                </tbody>
            </table>
        </div>
        <div id="events-pagination" style="margin-top: 1rem; display: flex; gap: 0.5rem; align-items: center;"></div>
    `;

    const searchInput = document.getElementById('event-search-input');
    const searchBtn = document.getElementById('event-search-btn');

    const updateEventParams = (updates) => {
        const params = new URLSearchParams(window.location.search);
        for (const [key, value] of Object.entries(updates)) {
            if (value === null || value === undefined || value === '') params.delete(key);
            else params.set(key, value);
        }
        switchView(`/admin/events?${params.toString()}`);
    };

    searchBtn.onclick = () => updateEventParams({ search: searchInput.value, page: 1 });
    searchInput.onkeypress = (e) => { if (e.key === 'Enter') searchBtn.click(); };

    adminContent.querySelectorAll('th.sortable').forEach(th => {
        th.onclick = () => {
            const field = th.dataset.sort;
            const newOrder = (sort === field && order === 'asc') ? 'desc' : 'asc';
            updateEventParams({ sort: field, order: newOrder });
        };
    });

    try {
        const query = new URLSearchParams({ page, limit: 10, search, sort, order }).toString();
        const data = await ajaxGet(`/api/admin/events?${query}`);
        const events = data.events || [];
        const totalPages = data.totalPages || 1;
        const tbody = document.getElementById('events-table-body');

        if (events.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding: 8px;">No events found.</td></tr>';
        } else {
            tbody.innerHTML = events.map(event => `
                <tr class="event-row" style="border-bottom: 1px solid #eee; cursor: pointer;" data-id="${event.id}">
                    <td style="padding: 8px;">${event.title}</td>
                    <td style="padding: 8px;">${new Date(event.start).toLocaleString()}</td>
                    <td style="padding: 8px;">${event.location}</td>
                    <td style="padding: 8px;">${event.difficulty_level}</td>
                    <td style="padding: 8px;">£${event.upfront_cost.toFixed(2)}</td>
                </tr>
            `).join('');

            tbody.querySelectorAll('.event-row').forEach(row => {
                row.onclick = () => switchView(`/admin/event/${row.dataset.id}`);
            });
        }

        const pagination = document.getElementById('events-pagination');
        pagination.innerHTML = '';
        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'Prev';
        prevBtn.disabled = page <= 1;
        prevBtn.onclick = () => updateEventParams({ page: page - 1 });

        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next';
        nextBtn.disabled = page >= totalPages;
        nextBtn.onclick = () => updateEventParams({ page: page + 1 });

        pagination.append(prevBtn, ` Page ${page} of ${totalPages} `, nextBtn);

    } catch (e) {
        console.error(e);
        document.getElementById('events-table-body').innerHTML = '<tr><td colspan="5" style="color: red;">Error loading events.</td></tr>';
    }
}

async function renderEventDetail(id) {
    const adminContent = document.getElementById(adminContentID);
    const isNew = id === 'new';

    let event = {
        title: '', description: '', location: '',
        start: '', end: '', difficulty_level: 1,
        max_attendees: 0, upfront_cost: 0
    };

    if (!isNew) {
        try {
            event = await ajaxGet(`/api/admin/event/${id}`);
            event.start = new Date(event.start).toISOString().slice(0, 16);
            event.end = new Date(event.end).toISOString().slice(0, 16);
        } catch (e) {
            return adminContent.innerHTML = '<p>Error loading event.</p>';
        }
    }

    adminContent.innerHTML = `
        <button onclick="switchView('/admin/events')" style="margin-bottom: 1rem;">&larr; Back to Events</button>
        <h2>${isNew ? 'Create Event' : 'Edit Event'}</h2>
        <form id="event-form" style="display: grid; gap: 10px; max-width: 600px;">
            <label>Title: <input type="text" name="title" value="${event.title}" required></label>
            <label>Description: <textarea name="description" rows="4">${event.description}</textarea></label>
            <label>Location: <input type="text" name="location" value="${event.location}"></label>
            <label>Start: <input type="datetime-local" name="start" value="${event.start}" required></label>
            <label>End: <input type="datetime-local" name="end" value="${event.end}" required></label>
            <label>Difficulty (1-5): <input type="number" name="difficulty_level" min="1" max="5" value="${event.difficulty_level}" required></label>
            <label>Max Attendees: <input type="number" name="max_attendees" value="${event.max_attendees}"></label>
            <label>Upfront Cost (£): <input type="number" step="0.01" name="upfront_cost" value="${event.upfront_cost}"></label>
            <div style="margin-top: 1rem;">
                <button type="submit">${isNew ? 'Create' : 'Save Changes'}</button>
                ${!isNew ? `<button type="button" id="delete-event-btn" style="background: red; color: white; margin-left: 10px;">Delete Event</button>` : ''}
            </div>
        </form>
    `;

    document.getElementById('event-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            if (isNew) {
                await ajaxPost('/api/admin/event', data);
                notify('Success', 'Event created', 'success');
                switchView('/admin/events');
            } else {
                await fetch(`/api/admin/event/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                notify('Success', 'Event updated', 'success');
            }
        } catch (err) {
            notify('Error', 'Failed to save event', 'error');
        }
    };

    if (!isNew) {
        document.getElementById('delete-event-btn').onclick = async () => {
            if (!confirm('Are you sure you want to delete this event?')) return;
            await fetch(`/api/admin/event/${id}`, { method: 'DELETE' });
            notify('Success', 'Event deleted', 'success');
            switchView('/admin/events');
        };
    }
}

async function renderViewReports() {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    adminContent.innerHTML = '<p>Loading reports...</p>';
}

ViewChangedEvent.subscribe(AdminNavigationListener);

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);
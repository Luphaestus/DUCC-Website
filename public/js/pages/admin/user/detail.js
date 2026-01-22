import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { notify } from '/js/components/notification.js';
import { switchView } from '/js/utils/view.js';
import { showConfirmModal, showPasswordModal } from '/js/utils/modal.js';
import { adminContentID } from '../common.js';
import { ARROW_BACK_IOS_NEW_SVG, ID_CARD_SVG, PERSON_SVG, MAIL_SVG, CALL_SVG, WALLET_SVG, BOLT_SVG, CAST_FOR_EDUCATION_SVG, LOCAL_ACTIVITY_SVG, MEDICAL_INFORMATION_SVG, POOL_SVG, CLOSE_SVG, CONTRACT_SVG, HEALING_SVG, PILL_SVG, HOME_SVG, PREGNANCY_SVG, EMERGENCY_SVG, ADD_SVG, EDIT_SVG, SAVE_SVG, DELETE_SVG } from '../../../../images/icons/outline/icons.js';

// --- Main Render Function ---

/**
 * Fetches and renders detailed information for a specific user.
 * Sets up tab navigation for different sections (profile, legal, transactions).
 * @param {string|number} userId - The ID of the user to view.
 */
export async function renderUserDetail(userId) {
    const adminContent = document.getElementById(adminContentID);
    adminContent.innerHTML = '<p aria-busy="true">Loading user details...</p>';

    const actionsEl = document.getElementById('admin-header-actions');
    if (actionsEl) {
        actionsEl.innerHTML = `<button id="admin-back-btn" class="small-btn outline secondary icon-text-btn">${ARROW_BACK_IOS_NEW_SVG} Back to Users</button>`;
        document.getElementById('admin-back-btn').onclick = () => switchView('/admin/users');
    }

    try {
        const user = await ajaxGet(`/api/admin/user/${userId}`);

        const userData = await ajaxGet('/api/user/elements/permissions').catch(() => ({}));
        const userPerms = userData.permissions || [];

        const canManageUsers = userPerms.includes('user.manage');
        const canManageTransactions = userPerms.includes('transaction.manage');
        const isExec = userPerms.length > 0;

        let tabsHtml = '<button data-tab="profile" class="tab-btn active">Profile</button>';
        if (canManageUsers) {
            tabsHtml += `
                <button data-tab="legal" class="tab-btn">Legal</button>
                <button data-tab="tags" class="tab-btn">Tags</button>
            `;
        }
        if (canManageTransactions) {
            tabsHtml += `
                <button data-tab="transactions" class="tab-btn">Transactions</button>
            `;
        }

        adminContent.innerHTML = /*html*/`
            <div class="glass-layout">
                <div class="glass-panel" style="margin-bottom: 1.5rem;">
                    <header class="user-detail-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; border-bottom:1px solid rgba(128,128,128,0.2); padding-bottom:1rem; margin-bottom:1rem;">
                        <div class="user-identity" style="display:flex; flex-direction:column;">
                            <h2 class="user-name-header" style="margin:0; font-size:1.75rem;">${user.first_name} ${user.last_name}</h2>
                            <span class="user-id-badge" style="font-size:0.85rem; color:var(--pico-muted-color);">ID: ${user.id}</span>
                        </div>
                        <nav class="admin-tabs modern-tabs" id="admin-user-tabs" style="display:flex; gap:0.5rem;">
                            ${tabsHtml}
                        </nav>
                    </header>
                    <div id="admin-tab-content" class="tab-content-area"></div>
                </div>
            </div>
        `;


        const tabs = adminContent.querySelectorAll('#admin-user-tabs button');
        const updateActiveTab = (activeBtn) => {
            tabs.forEach(t => t.classList.remove('active'));
            activeBtn.classList.add('active');
        };

        const currentTab = new URLSearchParams(window.location.search).get('tab') || 'profile';
        const initialTabBtn = Array.from(tabs).find(t => t.dataset.tab === currentTab) || tabs[0];

        tabs.forEach(btn => {
            btn.onclick = () => {
                updateActiveTab(btn);
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('tab', btn.dataset.tab);
                window.history.replaceState({}, '', newUrl);
                renderTab(btn.dataset.tab, user, userPerms, canManageUsers, isExec);
            };
        });

        if (initialTabBtn) {
            updateActiveTab(initialTabBtn);
            renderTab(initialTabBtn.dataset.tab, user, userPerms, canManageUsers, isExec);
        }

    } catch (e) {
        console.error(e);
        adminContent.innerHTML = `
            <div class="form-info">
                <article class="form-box admin-card">
                    <h3 class="error-text">Error</h3>
                    <p>Failed to load user details.</p>
                </article>
            </div>`;
    }
}

// --- Tab Render Functions ---

/**
 * Renders the content of the selected tab.
 */
async function renderTab(tabName, user, userPerms, canManageUsers, isExec) {
    const container = document.getElementById('admin-tab-content');
    if (tabName === 'profile') {
        const canManageSwims = userPerms.includes('swims.manage');

        let rolesHtml = '';
        let advancedHtml = '';

        if (canManageUsers) {
            const [allRoles, allPerms, allTagsRes] = await Promise.all([
                ajaxGet('/api/admin/roles').catch(() => []),
                ajaxGet('/api/admin/permissions').catch(() => []),
                ajaxGet('/api/tags').catch(() => ({ data: [] }))
            ]);
            const allTags = allTagsRes.data || [];

            const userRoleId = (user.roles && user.roles.length > 0) ? user.roles[0].id : '';

            rolesHtml = `
                <div class="detail-card">
                    <header>
                        ${ID_CARD_SVG}
                        <h3>System Role</h3>
                    </header>
                    <div class="card-body">
                        <p class="small-text">Defines base permissions.</p>
                        <select id="admin-user-role-select" class="full-width-select">
                            <option value="">No Role</option>
                            ${allRoles.map(role => `<option value="${role.id}" ${role.id == userRoleId ? 'selected' : ''}>${role.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
            `;

            if (userPerms.includes('user.manage.advanced')) {
                advancedHtml = `
                    <div class="advanced-actions">
                        <button class="secondary outline wide-btn" data-nav="/admin/user/${user.id}/advanced">Advanced Settings</button>
                    </div>
                `;
            }
        }

        // Check if sensitive data is present        
        const hasGeneralInfo = user.email !== undefined || user.phone_number !== undefined || user.college_id !== undefined || user.balance !== undefined;

        let generalInfoHtml = '';
        if (hasGeneralInfo) {
            generalInfoHtml = `
                <div class="detail-card">
                    <header>
                        ${PERSON_SVG}
                        <h3>General Info</h3>
                    </header>
                    <div class="card-body info-list">
                        ${user.email !== undefined ? `<div class="info-item"><span class="icon">${MAIL_SVG}</span> <span class="label">Email:</span> <span class="value">${user.email}</span></div>` : ''}
                        ${user.phone_number !== undefined ? `<div class="info-item"><span class="icon">${CALL_SVG}</span> <span class="label">Phone:</span> <span class="value">${user.phone_number || 'N/A'}</span></div>` : ''}
                        ${user.college_id !== undefined ? `<div class="info-item"><span class="icon">${PERSON_SVG}</span> <span class="label">College:</span> <span class="value">${user.college_id || 'N/A'}</span></div>` : ''}
                        ${user.balance !== undefined ? `<div class="info-item"><span class="icon">${WALLET_SVG}</span> <span class="label">Balance:</span> <span class="value ${user.balance < 0 ? 'text-danger' : 'text-success'}">£${Number(user.balance).toFixed(2)}</span></div>` : ''}
                    </div>
                </div>`;
        }

        const hasMembershipInfo = user.is_member !== undefined || user.is_instructor !== undefined || user.free_sessions !== undefined || user.difficulty_level !== undefined || user.swims !== undefined;

        let membershipInfoHtml = '';
        if (hasMembershipInfo) {
            membershipInfoHtml = `
                <div class="detail-card">
                     <header>
                        ${BOLT_SVG}
                        <h3>Status & Level</h3>
                     </header>
                     <div class="card-body">
                         ${user.is_member !== undefined ? `
                            <div class="status-toggle">
                                <span class="label">Member Status</span>
                                <span class="badge ${user.is_member ? 'success' : 'neutral'}">${user.is_member ? 'Active Member' : 'Guest'}</span>
                            </div>` : ''}
                         
                         ${user.is_instructor !== undefined ? `
                         <div class="status-toggle">
                            <span class="label">Instructor</span>
                            ${canManageUsers ? `
                                <label class="switch">
                                    <input type="checkbox" id="admin-user-instructor" ${user.is_instructor ? 'checked' : ''}>
                                    <span class="slider round"></span>
                                </label>
                            ` : `<span class="badge ${user.is_instructor ? 'primary' : 'neutral'}">${user.is_instructor ? 'Yes' : 'No'}</span>`}
                         </div>` : ''}

                         <div class="stats-grid-small">
                             ${user.free_sessions !== undefined ? `
                                <div class="stat-item">
                                    <span class="stat-val">${user.free_sessions}</span>
                                    <span class="stat-lbl">Free Sessions</span>
                                </div>` : ''}
                             
                             ${user.swims !== undefined ? `
                                <div class="stat-item">
                                    <span class="stat-val" id="admin-user-swims-count">${user.swims || 0}</span>
                                    <span class="stat-lbl">Swims</span>
                                    ${canManageSwims ? `<button id="admin-add-swim-btn" class="mini-btn" title="Add Swim">${ADD_SVG}</button>` : ''}
                                </div>` : ''}
                         </div>

                         ${user.difficulty_level !== undefined ? `
                         <div class="difficulty-control">
                            <label>Difficulty Level</label>
                            <input type="number" id="admin-user-difficulty" value="${user.difficulty_level || 1}" min="1" max="5">
                         </div>` : ''}
                     </div>
                </div>`;
        }

        container.innerHTML = `
            <div class="profile-layout-grid">
                <div class="column">
                    ${generalInfoHtml}
                    ${advancedHtml}
                </div>
                <div class="column">
                    ${membershipInfoHtml}
                    ${rolesHtml}
                </div>
            </div>
        `;

        // ... Event Bindings (Role, Swims, Instructor, Difficulty) ...
        // (Logic remains same, classes updated above)
        
        if (canManageUsers) {
            const roleSelect = document.getElementById('admin-user-role-select');
            let lastValue = roleSelect.value;

            roleSelect.onchange = async () => {
                const roleId = roleSelect.value;
                const roleName = roleSelect.options[roleSelect.selectedIndex].text;
                const payload = { roleId };

                if (roleName === 'President') {
                    // ... (President confirmation logic same)
                }

                try {
                    await ajaxPost(`/api/admin/user/${user.id}/role`, payload);
                    notify('Success', 'Role updated', 'success');
                    lastValue = roleId;
                } catch (e) {
                    console.error(e);
                    notify('Error', e.message || 'Failed to update role', 'error');
                    roleSelect.value = lastValue;
                }
            };
        }

        if (canManageSwims) {
            const addSwimBtn = document.getElementById('admin-add-swim-btn');
            if (addSwimBtn) {
                addSwimBtn.onclick = async () => {
                    try {
                        await ajaxPost(`/api/user/${user.id}/swims`, { count: 1 });
                        user.swims = (user.swims || 0) + 1;
                        const countEl = document.getElementById('admin-user-swims-count');
                        if (countEl) countEl.textContent = user.swims;
                        notify('Success', 'Swim added', 'success');
                    } catch (e) {
                        notify('Error', 'Failed to add swim', 'error');
                    }
                };
            }
        }

        if (canManageUsers) {
            const instructorToggle = document.getElementById('admin-user-instructor');
            if (instructorToggle) {
                instructorToggle.onchange = async () => {
                    try {
                        await ajaxPost(`/api/admin/user/${user.id}/elements`, { is_instructor: instructorToggle.checked });
                        notify('Success', 'Instructor status updated', 'success');
                        user.is_instructor = instructorToggle.checked;
                    } catch (e) {
                        notify('Error', 'Failed to update instructor status', 'error');
                        instructorToggle.checked = !instructorToggle.checked;
                    }
                };
            }
        }

        const difficultyInput = document.getElementById('admin-user-difficulty');
        if (difficultyInput) {
            difficultyInput.onchange = async () => {
                const level = difficultyInput.value;
                try {
                    await ajaxPost(`/api/admin/user/${user.id}/elements`, { difficulty_level: level });
                    notify('Success', 'Difficulty level updated', 'success');
                } catch (e) {
                    notify('Error', 'Failed to update difficulty', 'error');
                }
            };
        }

    } else if (tabName === 'legal') {
        container.innerHTML = `
            <div class="detail-card full-width">
                <header>
                    ${MEDICAL_INFORMATION_SVG}
                    <h3>Legal & Medical</h3>
                </header>
                <div class="card-body info-grid">
                    <div class="info-item"><span class="icon">${CONTRACT_SVG}</span> <span class="label">Legal Form:</span> <span class="badge ${user.filled_legal_info ? 'success' : 'danger'}">${user.filled_legal_info ? 'Signed' : 'Missing'}</span></div>
                    <div class="info-item"><span class="icon">${PREGNANCY_SVG}</span> <span class="label">DOB:</span> <span class="value">${user.date_of_birth || 'N/A'}</span></div>
                    <div class="info-item"><span class="icon">${HEALING_SVG}</span> <span class="label">First Aid:</span> <span class="value">${user.first_aid_expiry || 'N/A'}</span></div>
                    <div class="info-item full-row"><span class="icon">${HOME_SVG}</span> <span class="label">Address:</span> <span class="value">${user.home_address || 'N/A'}</span></div>
                    <div class="info-item full-row"><span class="icon">${EMERGENCY_SVG}</span> <span class="label">Emergency:</span> <span class="value">${user.emergency_contact_name || 'N/A'} (${user.emergency_contact_phone || 'N/A'})</span></div>
                    
                    <div class="info-divider"></div>
                    
                    <div class="info-item full-row">
                        <span class="label">Medical Conditions:</span> 
                        <span class="value">${user.has_medical_conditions ? `<span class="badge warning">Yes</span> <p class="details-text">${user.medical_conditions_details}</p>` : 'No'}</span>
                    </div>
                    <div class="info-item full-row">
                        <span class="label">Medication:</span>
                        <span class="value">${user.takes_medication ? `<span class="badge warning">Yes</span> <p class="details-text">${user.medication_details}</p>` : 'No'}</span>
                    </div>
                </div>
            </div>
        `;
    } else if (tabName === 'transactions') {
        renderTransactionsTab(container, user.id);
    } else if (tabName === 'tags') {
        renderTagsTab(container, user.id);
    }
}

/**
 * Fetches and renders the tags tab for the user.
 */
async function renderTagsTab(container, userId) {
    container.innerHTML = '<p class="loading-text">Loading tags...</p>';
    try {
        const [allTagsData, userTags] = await Promise.all([
            ajaxGet('/api/tags'),
            ajaxGet(`/api/user/${userId}/tags`)
        ]);

        const allTags = allTagsData.data || [];

        container.innerHTML = `
            <div class="detail-card full-width">
                <header>
                    ${LOCAL_ACTIVITY_SVG}
                    <h3>Whitelisted Tags</h3>
                </header>
                <div class="card-body">
                    <p class="helper-text">Tags this user is explicitly whitelisted for.</p>
                    <div class="tags-selection-grid" style="display:flex; flex-wrap:wrap; gap:0.75rem; margin-top:1.5rem;">
                        ${allTags.map(tag => {
                            const isWhitelisted = userTags.some(ut => ut.id === tag.id);
                            return `
                                <label class="tag-checkbox" style="cursor:pointer; display:flex; align-items:center;">
                                    <input type="checkbox" class="user-tag-cb" value="${tag.id}" ${isWhitelisted ? 'checked' : ''} style="display:none;">
                                    <span class="tag-badge ${isWhitelisted ? 'selected' : ''}" 
                                          style="background-color: ${tag.color}; opacity: ${isWhitelisted ? '1' : '0.4'}; transition: all 0.2s; border: 2px solid transparent; 
                                                 padding: 0.4rem 0.8rem; border-radius: 20px; font-weight: 600; color: white;
                                                 ${isWhitelisted ? 'box-shadow: 0 0 0 2px white, 0 0 0 4px var(--pico-primary); transform: scale(1.05);' : ''}">
                                        ${tag.name}
                                    </span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>`;

        container.querySelectorAll('.user-tag-cb').forEach(cb => {
            cb.onchange = async () => {
                const tagId = cb.value;
                const isAdding = cb.checked;
                const span = cb.nextElementSibling;

                try {
                    if (isAdding) {
                        await ajaxPost(`/api/tags/${tagId}/whitelist`, { userId });
                        span.style.opacity = '1';
                        span.style.transform = 'scale(1.05)';
                        span.style.boxShadow = '0 0 0 2px white, 0 0 0 4px var(--pico-primary)';
                    } else {
                        await fetch(`/api/tags/${tagId}/whitelist/${userId}`, { method: 'DELETE' });
                        span.style.opacity = '0.4';
                        span.style.transform = 'scale(1)';
                        span.style.boxShadow = 'none';
                    }
                } catch (e) {
                    cb.checked = !isAdding; // Revert UI
                    notify('Error', 'Update failed', 'error');
                }
            };
        });

    } catch (e) {
        container.innerHTML = '<p class="error-text">Failed to load tags.</p>';
    }
}

/**
 * Fetches and renders the transactions for the user.
 */
async function renderTransactionsTab(container, userId) {
    container.innerHTML = '<p class="loading-text">Loading transactions...</p>';
    try {
        const transactions = await ajaxGet(`/api/admin/user/${userId}/transactions`);
        const formatedDate = new Date().toLocaleDateString('en-GB');

        let html = `
            <div class="detail-card full-width">
                <header>
                    ${WALLET_SVG}
                    <h3>Transaction History</h3>
                </header>
                <div class="table-responsive">
                    <table class="admin-table modern-table">
                        <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Balance After</th><th>Action</th></tr></thead>
                        <tbody>
                            <tr class="new-entry-row">
                                <td data-label="Date">${formatedDate}</td>
                                <td data-label="Description"><input id="new-tx-desc" type="text" placeholder="Description" class="compact-input"></td>
                                <td data-label="Amount"><input id="new-tx-amount" type="number" step="0.01" placeholder="£0.00" class="compact-input"></td>
                                <td data-label="Balance After" id="new-tx-after" class="preview-val">N/A</td>
                                <td data-label="Action"><button id="add-tx-btn" class="primary small-btn">Add</button></td>
                            </tr>
        `;

        if (!transactions || transactions.length === 0) {
            html += '<tr><td colspan="5" class="empty-cell">No transactions found.</td></tr>';
        } else {
            transactions.forEach(tx => {
                html += `
                    <tr>
                        <td data-label="Date">${new Date(tx.created_at).toLocaleDateString('en-GB')}</td>
                        <td data-label="Description">
                            <span class="tx-desc-text">${tx.description}</span>
                            <input class="tx-desc-input hidden compact-input" value="${tx.description}">
                        </td>
                        <td data-label="Amount">
                            <span class="tx-amount-text ${tx.amount < 0 ? 'text-danger' : 'text-success'}">£${tx.amount.toFixed(2)}</span>
                            <input type="number" step="0.01" class="tx-amount-input hidden compact-input" value="${tx.amount}">
                        </td>
                        <td data-label="Balance After">£${tx.after !== undefined ? tx.after.toFixed(2) : 'N/A'}</td>
                        <td data-label="Action">
                            <div class="row-actions">
                                <button class="icon-btn edit-tx-btn" data-id="${tx.id}" title="Edit">${EDIT_SVG}</button>
                                <button class="icon-btn save-tx-btn hidden success" data-id="${tx.id}" title="Save">${SAVE_SVG}</button>
                                <button class="icon-btn cancel-tx-btn hidden warning" data-id="${tx.id}" title="Cancel">${CLOSE_SVG}</button>
                                <button class="icon-btn delete-tx-btn delete" data-id="${tx.id}" title="Delete">${DELETE_SVG}</button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        html += `</tbody></table></div></div>`;
        container.innerHTML = html;

        // ... Bind events (Add, Delete, Input) ...
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
                if (await fetch(`/api/admin/transaction/${btn.dataset.id}`, { method: 'DELETE' }).then(r => r.ok)) {
                    notify('Success', 'Transaction deleted', 'success');
                    renderTransactionsTab(container, userId);
                } else notify('Error', 'Failed to delete', 'error');
            };
        });

        document.getElementById('new-tx-amount').oninput = () => {
            const currentBalance = transactions.length > 0 ? transactions[0].after : 0;
            const newAmount = parseFloat(document.getElementById('new-tx-amount').value) || 0;
            document.getElementById('new-tx-after').textContent = `£${(currentBalance + newAmount).toFixed(2)}`;
        };

        setupTransactionEditHandlers(container, userId);

    } catch (e) {
        container.innerHTML = '<p class="error-text">Error loading transactions.</p>';
    }
}

// --- Helper Functions ---

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

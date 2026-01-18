import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { notify } from '/js/components/notification.js';
import { switchView } from '/js/utils/view.js';
import { showConfirmModal, showPasswordModal } from '/js/utils/modal.js';
import { adminContentID } from '../common.js';
import { ARROW_BACK_IOS_NEW_SVG, ID_CARD_SVG, PERSON_SVG, MAIL_SVG, CALL_SVG, WALLET_SVG, BOLT_SVG, CAST_FOR_EDUCATION_SVG, LOCAL_ACTIVITY_SVG, MEDICAL_INFORMATION_SVG, POOL_SVG, CLOSE_SVG, CONTRACT_SVG, HEALING_SVG, PILL_SVG, HOME_SVG, PREGNANCY_SVG, EMERGENCY_SVG } from '../../../../images/icons/outline/icons.js';

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
        actionsEl.innerHTML = `<button id="admin-back-btn">${ARROW_BACK_IOS_NEW_SVG} Back to Users</button>`;
        document.getElementById('admin-back-btn').onclick = () => switchView('/admin/users');
    }

    try {
        const user = await ajaxGet(`/api/admin/user/${userId}`);

        const userData = await ajaxGet('/api/user/elements/permissions').catch(() => ({}));
        const userPerms = userData.permissions || [];

        const canManageUsers = userPerms.includes('user.manage');
        const canManageTransactions = userPerms.includes('transaction.manage');
        const isExec = userPerms.length > 0;

        let tabsHtml = '<button class="tab-btn" data-tab="profile">Profile</button>';
        if (canManageUsers) {
            tabsHtml += `
                <button class="tab-btn" data-tab="legal">Legal</button>
                <button class="tab-btn" data-tab="tags">Tags</button>
            `;
        }
        if (canManageTransactions) {
            tabsHtml += `
                <button class="tab-btn" data-tab="transactions">Transactions</button>
            `;
        }

        adminContent.innerHTML = /*html*/`
            <div class="form-info user-detail-container" id="user-detail-container">
                <article class="form-box">
                    <div class="admin-controls-bar">
                        <div class="admin-nav-group" id="admin-user-tabs">
                            ${tabsHtml}
                        </div>
                        <h2 class="user-name-header">${user.first_name} ${user.last_name}</h2>
                    </div>
                    <div id="admin-tab-content"></div>
                </article>
            </div>
        `;


        const tabs = adminContent.querySelectorAll('.tab-btn');
        const updateActiveTab = (activeBtn) => {
            tabs.forEach(t => {
                t.classList.remove('active');
                t.disabled = false;
            });
            activeBtn.classList.add('active');
            activeBtn.disabled = true;
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

        updateActiveTab(initialTabBtn);
        renderTab(initialTabBtn.dataset.tab, user, userPerms, canManageUsers, isExec);

    } catch (e) {
        console.error(e);
        adminContent.innerHTML = `
            <div class="form-info">
                <article class="form-box">
                    <h3 class="error-text">Error</h3>
                    <p>Failed to load user details.</p>
                </article>
            </div>`;
    }
}

// --- Tab Render Functions ---

/**
 * Renders the content of the selected tab.
 * @param {string} tabName - The name of the tab to render ('profile', 'legal', or 'transactions').
 * @param {object} user - The user object containing all user details.
 * @param {array} userPerms - The array of permissions the current user has.
 * @param {boolean} canManageUsers - Whether the user has management permissions.
 * @param {boolean} isExec - Whether the user is an exec.
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
                <div class="event-details-section" id="admin-user-roles-container">
                    <h3>${ID_CARD_SVG} Role</h3>
                    <p class="small-text">Users can have only one role. Roles define the base permissions.</p>
                    <select id="admin-user-role-select" class="full-width">
                        <option value="">No Role</option>
                        ${allRoles.map(role => `<option value="${role.id}" ${role.id == userRoleId ? 'selected' : ''}>${role.name}</option>`).join('')}
                    </select>
                </div>
            `;

            if (userPerms.includes('user.manage.advanced')) {
                advancedHtml = `
                    <div style="margin-top: 1rem;">
                        <button class="contrast outline" data-nav="/admin/user/${user.id}/advanced">Advanced Settings</button>
                    </div>
                `;
            }
        }

        // Check if sensitive data is present        
        const hasGeneralInfo = user.email !== undefined || user.phone_number !== undefined || user.college_id !== undefined || user.balance !== undefined;

        let generalInfoHtml = '';
        if (hasGeneralInfo) {
            generalInfoHtml = `
                <div class="event-details-section" id="admin-user-general-info-container">
                    <h3>${PERSON_SVG} General Info</h3>
                    ${user.email !== undefined ? `<p>${MAIL_SVG} <strong>Email:</strong> ${user.email}</p>` : ''}
                    ${user.phone_number !== undefined ? `<p>${CALL_SVG} <strong>Phone:</strong> ${user.phone_number || 'N/A'}</p>` : ''}
                    ${user.college_id !== undefined ? `<p>${PERSON_SVG} <strong>College:</strong> ${user.college_id || 'N/A'}</p>` : ''}
                    ${user.balance !== undefined ? `<p>${WALLET_SVG} <strong>Balance:</strong> £${Number(user.balance).toFixed(2)}</p>` : ''}
                </div>`;
        }

        const hasMembershipInfo = user.is_member !== undefined || user.is_instructor !== undefined || user.free_sessions !== undefined || user.difficulty_level !== undefined || user.swims !== undefined;

        let membershipInfoHtml = '';
        if (hasMembershipInfo) {
            membershipInfoHtml = `
                <div class="event-details-section" id="admin-user-membership-container">
                     <h3>${BOLT_SVG} Status & Level</h3>
                     ${user.is_member !== undefined ? `<p>${PERSON_SVG} <strong>Member:</strong> ${user.is_member ? 'Yes' : 'No'}</p>` : ''}
                     ${user.is_instructor !== undefined ? `
                     <p>
                        <label>
                            ${CAST_FOR_EDUCATION_SVG} <strong>Instructor:</strong>
                            ${canManageUsers ? `<input type="checkbox" id="admin-user-instructor" ${user.is_instructor ? 'checked' : ''}>` : (user.is_instructor ? 'Yes' : 'No')}
                        </label>
                     </p>` : ''}
                     ${user.free_sessions !== undefined ? `<p>${LOCAL_ACTIVITY_SVG} <strong>Free Sessions:</strong> ${user.free_sessions}</p>` : ''}
                     ${user.difficulty_level !== undefined ? `
                     <div class="detail-difficulty-control">
                        <strong>${BOLT_SVG} Difficulty Level:</strong>
                        <input type="number" id="admin-user-difficulty" value="${user.difficulty_level || 1}" min="1" max="5">
                     </div>` : ''}
                     ${user.swims !== undefined ? `
                     <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem; margin-left: 0; margin-right: 0;">
                        <span style="display: flex; align-items: center; gap: 0.5rem;">
                            ${POOL_SVG} <strong>Swims:</strong> 
                        </span>
                        <span id="admin-user-swims-count">${user.swims || 0}</span>
                        ${canManageSwims ? `<button id="admin-add-swim-btn" class="status-btn" style="margin: 0; padding: 0.2rem 0.6rem;">+1</button>` : ''}
                     </div>` : ''}
                </div>`;
        }

        container.innerHTML = `
            <div class="event-content-split" id="admin-user-profile-container">
                ${generalInfoHtml}
                ${membershipInfoHtml}
                ${rolesHtml}
                ${advancedHtml}
            </div>
        `;

        if (canManageUsers) {
            const roleSelect = document.getElementById('admin-user-role-select');
            let lastValue = roleSelect.value;

            roleSelect.onchange = async () => {
                const roleId = roleSelect.value;
                const roleName = roleSelect.options[roleSelect.selectedIndex].text;

                const payload = { roleId };

                if (roleName === 'President') {
                    const confirmed = await showConfirmModal("Transfer President Role", "Are you sure you want to transfer the President role? This will reset all other roles and permissions in the club. This action is irreversible.");
                    if (!confirmed) {
                        roleSelect.value = lastValue;
                        return;
                    }
                    const password = await showPasswordModal("Confirm Transfer", "Please enter your current password to confirm the transfer:");
                    if (!password) {
                        roleSelect.value = lastValue;
                        return;
                    }
                    payload.password = password;
                }

                try {
                    await ajaxPost(`/api/admin/user/${user.id}/role`, payload);
                    notify('Success', 'Role updated', 'success');
                    lastValue = roleId;

                    if (roleName === 'President') {
                        setTimeout(() => location.reload(), 1500);
                    }
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
                        console.error(e);
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
                    console.error(e);
                    notify('Error', 'Failed to update difficulty', 'error');
                }
            };
        }

    } else if (tabName === 'legal') {
        container.innerHTML = `
            <div class="event-details-section" id="admin-user-legal-container">
                <h3>${MEDICAL_INFORMATION_SVG} Legal & Medical</h3>
                <p>${CONTRACT_SVG} <strong>Filled Legal Info:</strong> ${user.filled_legal_info ? 'Yes' : 'No'}</p>
                <p>${PREGNANCY_SVG} <strong>Date of Birth:</strong> ${user.date_of_birth || 'N/A'}</p>
                <p>${HOME_SVG} <strong>Address:</strong> ${user.home_address || 'N/A'}</p>
                <p>${EMERGENCY_SVG} <strong>Emergency Contact:</strong> ${user.emergency_contact_name || 'N/A'} (${user.emergency_contact_phone || 'N/A'})</p>
                <p>${MEDICAL_INFORMATION_SVG} <strong>Medical Conditions:</strong> ${user.has_medical_conditions ? 'Yes' : 'No'}</p>
                ${user.has_medical_conditions ? `<p><strong>Details:</strong> ${user.medical_conditions_details}</p>` : ''}
                <p>${PILL_SVG} <strong>Medication:</strong> ${user.takes_medication ? 'Yes' : 'No'}</p>
                ${user.takes_medication ? `<p><strong>Details:</strong> ${user.medication_details}</p>` : ''}
                <p>${HEALING_SVG} <strong>First Aid Expiry:</strong> ${user.first_aid_expiry || 'N/A'}</p>
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
 * Allows adding and removing tags.
 * @param {HTMLElement} container - The container to render the tags into.
 * @param {string|number} userId - The ID of the user.
 */
async function renderTagsTab(container, userId) {
    container.innerHTML = '<p aria-busy="true">Loading tags...</p>';
    try {
        const [allTagsData, userTags] = await Promise.all([
            ajaxGet('/api/tags'),
            ajaxGet(`/api/user/${userId}/tags`)
        ]);

        const allTags = allTagsData.data || [];
        const availableTags = allTags.filter(tag => !userTags.some(ut => ut.id === tag.id));

        let html = `
            <div class="event-details-section">
                <h3>Tags</h3>
                <div class="tag-controls">
                    <select id="admin-add-tag-select" class="admin-tag-select">
                        <option value="">Select a tag to add...</option>
                        ${availableTags.map(tag => `<option value="${tag.id}">${tag.name}</option>`).join('')}
                    </select>
                    <button id="admin-add-tag-btn" disabled>Add Tag</button>
                </div>
                <div id="admin-user-tags-list" class="user-tags-list">
        `;

        if (userTags.length === 0) {
            html += '<p>No tags assigned.</p>';
        } else {
            userTags.forEach(tag => {
                html += `
                    <div class="user-tag-item" style="background-color: ${tag.color};">
                        <span>${tag.name}</span>
                        <button class="remove-tag-btn" data-tag-id="${tag.id}">${CLOSE_SVG}</button>
                    </div>
                `;
            });
        }

        html += `</div></div>`;
        container.innerHTML = html;

        // Bind events
        const select = document.getElementById('admin-add-tag-select');
        const addBtn = document.getElementById('admin-add-tag-btn');

        if (select) {
            select.onchange = () => {
                addBtn.disabled = !select.value;
            };

            addBtn.onclick = async () => {
                const tagId = select.value;
                if (!tagId) return;

                try {
                    await ajaxPost(`/api/tags/${tagId}/whitelist`, { userId });
                    notify('Success', 'Tag added', 'success');
                    renderTagsTab(container, userId);
                } catch (e) {
                    console.error(e);
                    notify('Error', 'Failed to add tag', 'error');
                }
            };
        }

        container.querySelectorAll('.remove-tag-btn').forEach(btn => {
            btn.onclick = async () => {
                const tagId = btn.dataset.tagId;
                if (!confirm('Are you sure you want to remove this tag from the user?')) return;

                try {
                    await fetch(`/api/tags/${tagId}/whitelist/${userId}`, { method: 'DELETE' });
                    notify('Success', 'Tag removed', 'success');
                    renderTagsTab(container, userId);
                } catch (e) {
                    console.error(e);
                    notify('Error', 'Failed to remove tag', 'error');
                }
            };
        });

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="error-text">Failed to load tags.</p>';
    }
}

/**
 * Fetches and renders the transactions for the user.
 * Allows adding, editing, and deleting transactions.
 * @param {HTMLElement} container - The container to render the transactions table into.
 * @param {string|number} userId - The ID of the user.
 */
async function renderTransactionsTab(container, userId) {
    container.innerHTML = '<p aria-busy="true">Loading transactions...</p>';
    try {
        const transactions = await ajaxGet(`/api/admin/user/${userId}/transactions`);

        const formatedDate = new Date().toLocaleDateString('en-GB');

        let html = `
            <h3>${WALLET_SVG} Transactions</h3>
            <div class="table-responsive">
                <table class="admin-table full-width">
                    <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Balance After</th><th>Action</th></tr></thead>
                    <tbody>
                        <tr>
                            <td data-label="Date">${formatedDate}</td>
                            <td data-label="Description"><input id="new-tx-desc" type="text" placeholder="Description"></td>
                            <td data-label="Amount"><input id="new-tx-amount" type="number" step="0.01" placeholder="Amount"></td>
                            <td data-label="Balance After" id="new-tx-after">N/A</td>
                            <td data-label="Action"><button id="add-tx-btn">Add</button></td>
                        </tr>
        `;

        if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
            html += '<tr><td colspan="5">No transactions found.</td></tr>';
        } else {
            transactions.forEach(tx => {
                html += `
                    <tr>
                        <td data-label="Date">${new Date(tx.created_at).toLocaleDateString('en-GB')}</td>
                        <td data-label="Description">
                            <span class="tx-desc-text">${tx.description}</span>
                            <input class="tx-desc-input hidden" value="${tx.description}">
                        </td>
                        <td data-label="Amount">
                            <span class="tx-amount-text">£${tx.amount.toFixed(2)}</span>
                            <input type="number" step="0.01" class="tx-amount-input hidden" value="${tx.amount}">
                        </td>
                        <td data-label="Balance After">£${tx.after !== undefined ? tx.after.toFixed(2) : 'N/A'}</td>
                        <td data-label="Action">
                            <div class="tx-actions">
                                <button class="edit-tx-btn" data-id="${tx.id}">Edit</button>
                                <button class="save-tx-btn hidden" data-id="${tx.id}">Save</button>
                                <button class="cancel-tx-btn hidden" data-id="${tx.id}">Cancel</button>
                                <button class="delete-tx-btn delete" data-id="${tx.id}">Delete</button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        html += `</tbody></table></div>`;
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
                const res = await fetch(`/api/admin/transaction/${btn.dataset.id}`, { method: 'DELETE' });
                if (res.ok) {
                    notify('Success', 'Transaction deleted', 'success');
                    renderTransactionsTab(container, userId);
                } else {
                    notify('Error', 'Failed to delete transaction', 'error');
                }
            };
        });

        document.getElementById('new-tx-amount').oninput = () => {
            const currentBalance = transactions.length > 0 ? transactions[0].after : 0;
            const newAmount = parseFloat(document.getElementById('new-tx-amount').value) || 0;
            const newBalance = currentBalance + newAmount;
            document.getElementById('new-tx-after').textContent = `£${newBalance.toFixed(2)}`;
        };

        setupTransactionEditHandlers(container, userId);

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p>Error loading transactions.</p>';
    }
}

// --- Helper Functions ---

/**
 * Sets up event listeners for editing, saving, and cancelling transaction edits.
 * @param {HTMLElement} container - The container containing the transactions table.
 * @param {string|number} userId - The ID of the user.
 */
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

/**
 * profile.js (Admin User Tab)
 * 
 * Renders the "Profile" tab within the administrative user management view.
 */

import { apiRequest } from '/js/utils/api.js';
import { notify } from '/js/components/notification.js';
import { showPasswordModal } from '/js/utils/modal.js';
import { renderUserDetail } from '../detail.js';
import { getOrdinal } from '/js/utils/utils.js';
import { Panel } from '/js/widgets/panel.js';
import { ValueHeader } from '/js/widgets/value_header.js';
import { POOL_SVG, ADD_SVG, PERSON_SVG, EDIT_SVG, BOLT_SVG, ID_CARD_SVG, SHIELD_SVG, CLOSE_SVG } from '../../../../../images/icons/outline/icons.js';

/**
 * Main rendering and logic binding function for the Admin Profile tab.
 * 
 * @param {HTMLElement} container - Tab content area.
 * @param {object} user - Target user data object.
 * @param {string[]} userPerms - Current admin's permissions.
 * @param {boolean} canManageUsers - Access flag.
 * @param {boolean} isExec - Access flag.
 */
export async function renderProfileTab(container, user, userPerms, canManageUsers, isExec) {
    const canManageSwims = userPerms.includes('swims.manage');
    const bal = Number(user.balance || 0);

    const [collegesRes, globalData] = await Promise.all([
        apiRequest('GET', '/api/colleges').catch(() => ({ data: [] })),
        apiRequest('GET', '/api/globals/MinMoney').catch(() => ({ res: { MinMoney: { data: -25 } } }))
    ]);

    const colleges = collegesRes.data || [];
    const minMoney = Number(globalData.res?.MinMoney?.data || -25);
    const collegeName = colleges.find(c => c.id === user.college_id)?.name || 'N/A';
    const emailUsername = user.email ? user.email.split('@')[0] : '';

    let balClass = 'warning';
    if (bal < minMoney) balClass = 'negative';
    else if (bal >= 0) balClass = 'positive';

    container.innerHTML = `
        <div class="dashboard-section active">
            
            <!-- Balance & Member Status -->
            <div class="dual-grid">
                ${ValueHeader({
                    title: 'Account Balance',
                    value: `£${bal.toFixed(2)}`,
                    valueId: 'balance-amount',
                    valueClass: balClass,
                    classes: 'clickable',
                    id: 'admin-profile-balance-card'
                })}
                
                ${ValueHeader({
                    title: 'Member Status',
                    value: user.is_member ? 'Active Member' : (user.free_sessions || 0),
                    valueClass: user.is_member ? 'positive' : '',
                    actions: !user.is_member ? `<span class="label label-sub">free sessions remaining</span>` : ''
                })}
            </div>

            <!-- Swimming Stats & Manual Log -->
            ${Panel({
                title: 'Swimming Stats',
                icon: POOL_SVG,
                action: canManageSwims ? `<button id="admin-add-swim-btn" class="small-btn icon-text-btn">${ADD_SVG} Log Swim</button>` : '',
                content: `
                    <div class="stats-grid" id="admin-swimming-stats-grid">
                        <div class="stat-item">
                            <span class="stat-value" id="admin-user-swims-yearly">${user.swimmer_stats?.yearly?.swims || 0}</span>
                            <span class="stat-label">Yearly Swims</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" id="admin-user-rank-yearly">${getOrdinal(user.swimmer_stats?.yearly?.rank)}</span>
                            <span class="stat-label">Yearly Rank</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" id="admin-user-swims-total">${user.swimmer_stats?.allTime?.swims || 0}</span>
                            <span class="stat-label">Total Swims</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" id="admin-user-rank-total">${getOrdinal(user.swimmer_stats?.allTime?.rank)}</span>
                            <span class="stat-label">All Time Rank</span>
                        </div>
                    </div>
                `
            })}

            <div class="dual-grid">
                <!-- Account Metadata Editor -->
                ${Panel({
                    id: 'admin-account-details-panel',
                    title: 'Account Details',
                    icon: PERSON_SVG,
                    action: userPerms.includes('user.manage.advanced') ? `<button id="edit-account-btn" class="small-btn secondary">${EDIT_SVG} Edit</button>` : '',
                    content: `
                        <div id="account-info-display" class="info-rows">
                            <div class="info-row-modern">
                                <span class="label">Email</span>
                                <span class="value">${user.email}</span>
                            </div>
                            <div class="info-row-modern">
                                <span class="label">Phone</span>
                                <span class="value">${user.phone_number || 'N/A'}</span>
                            </div>
                            <div class="info-row-modern">
                                <span class="label">College</span>
                                <span class="value">${collegeName}</span>
                            </div>
                        </div>
                        <form id="account-info-form" class="hidden modern-form">
                            <label>Email 
                                <div class="durham-email-wrapper">
                                    <input type="text" id="input-email" value="${emailUsername}">
                                    <span class="email-suffix">@durham.ac.uk</span>
                                </div>
                            </label>
                            <label>Phone <input type="tel" id="input-phone" value="${user.phone_number || ''}"></label>
                            <label>College 
                                <select id="input-college">
                                    <option value="">Select College</option>
                                    ${colleges.map(c => `<option value="${c.id}" ${c.id === user.college_id ? 'selected' : ''}>${c.name}</option>`).join('')}
                                </select>
                            </label>
                            ${canManageUsers ? `
                                <div class="grid-2-col">
                                    <label>Free Sessions <input type="number" id="input-free-sessions" value="${user.free_sessions}"></label>
                                    <label>Swims (Total) <input type="number" id="input-total-swims" value="${user.swims}"></label>
                                </div>
                                <div class="checkbox-group">
                                    <label><input type="checkbox" id="input-is-member" ${user.is_member ? 'checked' : ''}> Is Member</label>
                                    <label><input type="checkbox" id="input-is-instructor" ${user.is_instructor ? 'checked' : ''}> Is Instructor</label>
                                </div>
                            ` : ''}
                            <div class="form-actions">
                                <button type="button" id="cancel-account-btn" class="secondary outline small-btn">Cancel</button>
                                <button type="submit" class="small-btn">Save</button>
                            </div>
                        </form>
                    `
                })}

                <!-- Instructor Status & Skill Level -->
                ${Panel({
                    title: 'Capabilities',
                    icon: BOLT_SVG,
                    content: `
                        <div class="role-toggle">
                            <div class="role-info">
                                <h4>Instructor Status</h4>
                                <p class="font-size-0-85 muted-color">Authorized to lead club sessions</p>
                            </div>
                            ${canManageUsers ? `
                                <label class="switch">
                                    <input type="checkbox" id="admin-user-instructor" ${user.is_instructor ? 'checked' : ''}>
                                    <span class="slider round"></span>
                                </label>
                            ` : `<span class="badge ${user.is_instructor ? 'primary' : 'neutral'}">${user.is_instructor ? 'Yes' : 'No'}</span>`}
                        </div>
                        <div class="difficulty-control">
                            <label class="font-weight-600 font-size-0-9">Difficulty Level (1-5)</label>
                            <input type="range" id="admin-user-difficulty" value="${user.difficulty_level || 1}" min="1" max="5" step="1">
                            <div class="range-labels font-size-0-75 muted-color">
                                <span>Beginner</span>
                                <span>Advanced</span>
                            </div>
                        </div>
                    `
                })}
            </div>

            <div class="dual-grid">
                <!-- RBAC: System Role Assignment -->
                ${Panel({
                    title: 'System Role',
                    icon: ID_CARD_SVG,
                    content: `
                        <div class="card-body">
                            <p class="small-text">Defines base permissions and access levels.</p>
                            <select id="admin-user-role-select" class="full-width-select">
                                <option value="">No Role</option>
                            </select>
                        </div>
                    `
                })}

                <!-- Direct Permission Overrides -->
                ${Panel({
                    title: 'Direct Permissions',
                    icon: SHIELD_SVG,
                    content: `
                        <div class="card-body">
                            <p class="small-text">Explicitly granted permissions (overrides role).</p>
                            <div class="inline-add-form">
                                <select id="add-perm-select">
                                    <option value="">Select Permission...</option>
                                </select>
                                <button id="add-perm-btn" class="icon-btn small-btn">${ADD_SVG}</button>
                            </div>
                            <div id="direct-perms-list" class="tags-cloud">
                                ${(user.direct_permissions || []).map(p => `
                                    <span class="tag-chip neutral">
                                        ${p.slug} 
                                        <button class="remove-perm-btn delete-icon-btn" data-id="${p.id}">${CLOSE_SVG}</button>
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    `
                })}
            </div>
        </div>
    `;

    // --- Interactive Logic Hooks ---

    if (canManageUsers) {
        const roleSelect = document.getElementById('admin-user-role-select');
        if (roleSelect) {
            const allRoles = await apiRequest('GET', '/api/admin/roles').catch(() => []);
            const userRoleId = (user.roles && user.roles.length > 0) ? user.roles[0].id : '';
            roleSelect.innerHTML = `<option value="">No Role</option>` + allRoles.map(role => `<option value="${role.id}" ${role.id == userRoleId ? 'selected' : ''}>${role.name}</option>`).join('');

            let lastValue = roleSelect.value;
            roleSelect.onchange = async () => {
                const selectedRole = allRoles.find(r => r.id == roleSelect.value);
                const isPresident = selectedRole?.name === 'President';

                let password = null;
                if (isPresident) {
                    password = await showPasswordModal(
                        'Transfer President Role',
                        'Transferring the President role is a <strong>critical action</strong>. This will:<br><br>1. <strong>Remove all permissions</strong> from every other Exec member.<br>2. <strong>Wipe medical information</strong> for all users who have not consented to long-term storage.<br><br>Enter your password to confirm this transfer.'
                    );
                    if (!password) {
                        roleSelect.value = lastValue;
                        return;
                    }
                }

                try {
                    await apiRequest('POST', `/api/admin/user/${user.id}/role`, { roleId: roleSelect.value, password });
                    notify('Success', 'Role updated', 'success');
                    lastValue = roleSelect.value;
                    if (isPresident) renderUserDetail(user.id);
                } catch (e) {
                    notify('Error', e.message || 'Failed to update role', 'error');
                    roleSelect.value = lastValue;
                }
            };
        }

        // --- Instructor Status Toggle ---
        const instructorToggle = document.getElementById('admin-user-instructor');
        if (instructorToggle) {
            instructorToggle.onchange = async () => {
                try {
                    await apiRequest('POST', `/api/admin/user/${user.id}/elements`, { is_instructor: instructorToggle.checked });
                    notify('Success', 'Instructor status updated', 'success');
                    user.is_instructor = instructorToggle.checked;
                } catch (e) {
                    notify('Error', 'Failed to update instructor status', 'error');
                    instructorToggle.checked = !instructorToggle.checked;
                }
            };
        }

        // --- Direct Permission Management ---
        const permSelect = document.getElementById('add-perm-select');
        if (permSelect) {
            const allPerms = await apiRequest('GET', '/api/admin/permissions').catch(() => []);
            permSelect.innerHTML += allPerms.map(p => `<option value="${p.id}">${p.slug}</option>`).join('');

            document.getElementById('add-perm-btn').onclick = async () => {
                const permId = permSelect.value;
                if (!permId) return;
                try {
                    await apiRequest('POST', `/api/admin/user/${user.id}/permission`, { permissionId: permId });
                    notify('Success', 'Permission added', 'success');
                    const updatedUser = await apiRequest('GET', `/api/admin/user/${user.id}`);
                    renderProfileTab(container, updatedUser, userPerms, canManageUsers, isExec);
                } catch (e) { notify('Error', 'Failed to add permission', 'error'); }
            };

            container.querySelectorAll('.remove-perm-btn').forEach(btn => {
                btn.onclick = async () => {
                    try {
                        await apiRequest('DELETE', `/api/admin/user/${user.id}/permission/${btn.dataset.id}`);
                        notify('Success', 'Permission removed', 'success');
                        const updatedUser = await apiRequest('GET', `/api/admin/user/${user.id}`);
                        renderProfileTab(container, updatedUser, userPerms, canManageUsers, isExec);
                    } catch (e) { notify('Error', 'Failed to remove', 'error'); }
                };
            });
        }

        // --- Inline Metadata Editor Logic ---
        const editBtn = document.getElementById('edit-account-btn');
        if (editBtn) {
            const displayDiv = document.getElementById('account-info-display');
            const form = document.getElementById('account-info-form');
            const cancelBtn = document.getElementById('cancel-account-btn');

            editBtn.onclick = () => {
                displayDiv.classList.add('hidden');
                form.classList.remove('hidden');
                editBtn.classList.add('hidden');
            };

            const closeEdit = () => {
                displayDiv.classList.remove('hidden');
                form.classList.add('hidden');
                editBtn.classList.remove('hidden');
            };

            const emailInput = document.getElementById('input-email');
            if (emailInput) {
                emailInput.addEventListener('input', () => {
                    if (emailInput.value.includes('@')) {
                        emailInput.value = emailInput.value.split('@')[0];
                    }
                });
            }

            cancelBtn.onclick = closeEdit;

            form.onsubmit = async (e) => {
                e.preventDefault();
                let emailVal = document.getElementById('input-email').value;
                if (emailVal && !emailVal.includes('@')) emailVal += '@durham.ac.uk';

                const updateData = {
                    email: emailVal,
                    phone_number: document.getElementById('input-phone').value,
                    college_id: parseInt(document.getElementById('input-college').value) || null
                };
                if (canManageUsers) {
                    updateData.free_sessions = parseInt(document.getElementById('input-free-sessions').value);
                    updateData.swims = parseInt(document.getElementById('input-total-swims').value);
                    updateData.is_member = document.getElementById('input-is-member').checked;
                    updateData.is_instructor = document.getElementById('input-is-instructor').checked;
                }
                try {
                    await apiRequest('POST', `/api/admin/user/${user.id}/elements`, updateData);
                    notify('Success', 'Account details updated', 'success');
                    Object.assign(user, updateData);
                    renderProfileTab(container, user, userPerms, canManageUsers, isExec);
                } catch (err) {
                    notify('Error', err.message, 'error');
                }
            };
        }

        // Shortcut to transactions tab
        const balanceCard = document.getElementById('admin-profile-balance-card');
        if (balanceCard) {
            balanceCard.onclick = () => {
                const txTab = document.querySelector('button[data-tab="transactions"]');
                if (txTab) txTab.click();
            };
        }

        // --- Manual Swim Logger ---
        if (canManageSwims) {
            document.getElementById('admin-add-swim-btn').onclick = async () => {
                try {
                    await apiRequest('POST', `/api/user/${user.id}/swims`, { count: 1 });

                    const statsRes = await apiRequest('GET', `/api/user/${user.id}/elements/swimmer_rank`);
                    if (statsRes.swimmer_stats) {
                        user.swimmer_stats = statsRes.swimmer_stats;
                    }

                    const yearlyEl = document.getElementById('admin-user-swims-yearly');
                    const yearlyRankEl = document.getElementById('admin-user-rank-yearly');
                    const totalEl = document.getElementById('admin-user-swims-total');
                    const totalRankEl = document.getElementById('admin-user-rank-total');

                    if (yearlyEl) yearlyEl.textContent = user.swimmer_stats.yearly.swims;
                    if (yearlyRankEl) yearlyRankEl.textContent = getOrdinal(user.swimmer_stats.yearly.rank);
                    if (totalEl) totalEl.textContent = user.swimmer_stats.allTime.swims;
                    if (totalRankEl) totalRankEl.textContent = getOrdinal(user.swimmer_stats.allTime.rank);

                    notify('Success', 'Swim logged', 'success');
                } catch (e) {
                    notify('Error', 'Failed to log swim', 'error');
                }
            };
        }

        // --- Difficulty Level Logic ---
        const difficultyInput = document.getElementById('admin-user-difficulty');
        if (difficultyInput) {
            difficultyInput.onchange = async () => {
                try {
                    await apiRequest('POST', `/api/admin/user/${user.id}/elements`, { difficulty_level: difficultyInput.value });
                    notify('Success', 'Difficulty level updated', 'success');
                    user.difficulty_level = difficultyInput.value;
                } catch (e) {
                    notify('Error', 'Failed to update level', 'error');
                }
            };
        }
    }
}
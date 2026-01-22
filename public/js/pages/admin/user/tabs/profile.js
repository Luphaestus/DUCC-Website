import { ajaxGet, ajaxPost, ajaxDelete } from '/js/utils/ajax.js';
import { notify } from '/js/components/notification.js';
import { showPasswordModal } from '/js/utils/modal.js';
import { renderUserDetail } from '../detail.js';
import { getOrdinal } from '../utils.js';
import { POOL_SVG, ADD_SVG, PERSON_SVG, EDIT_SVG, BOLT_SVG, ID_CARD_SVG, SHIELD_SVG, CLOSE_SVG } from '../../../../../images/icons/outline/icons.js';

/**
 * Renders the Profile tab content.
 */
export async function renderProfileTab(container, user, userPerms, canManageUsers, isExec) {
    const canManageSwims = userPerms.includes('swims.manage');
    const bal = Number(user.balance || 0);

    const collegesRes = await ajaxGet('/api/colleges').catch(() => ({ data: [] }));
    const colleges = collegesRes.data || [];
    const collegeName = colleges.find(c => c.id === user.college_id)?.name || 'N/A';

    container.innerHTML = `
        <div class="dashboard-section active" style="gap: 1.5rem; display: flex; flex-direction: column;">
            
            <!-- 1. Balance & Status Dual Grid -->
            <div class="dual-grid" style="gap: 1.5rem; display: grid; grid-template-columns: 1fr 1fr;">
                <div class="balance-header clickable" id="admin-profile-balance-card" style="padding: 1.5rem; cursor: pointer; transition: transform 0.2s ease;">
                    <div class="balance-info">
                        <span class="label">Account Balance</span>
                        <span class="amount" id="balance-amount" style="color: ${bal < 0 ? '#e74c3c' : (bal > 0 ? '#2ecc71' : 'inherit')}">
                            £${bal.toFixed(2)}
                        </span>
                    </div>
                </div>
                
                <div class="balance-header" style="padding: 1.5rem;">
                    <div class="balance-info">
                        <span class="label">Member Status</span>
                        <span class="amount" style="color: ${user.is_member ? '#2ecc71' : 'var(--pico-muted-color)'}; font-size: 2.2rem; margin-bottom: 0.25rem;">
                            ${user.is_member ? 'Active Member' : (user.free_sessions || 0)}
                        </span>
                        ${!user.is_member ? `<span class="label" style="text-transform: none; font-weight: 600; opacity: 0.8;">free sessions remaining</span>` : ''}
                    </div>
                </div>
            </div>

            <!-- 2. Swimming Stats Grid -->
            <div class="glass-panel">
                <div class="box-header">
                    <h3>${POOL_SVG} Swimming Stats</h3>
                    ${canManageSwims ? `<button id="admin-add-swim-btn" class="small-btn primary icon-text-btn" style="margin:0;">${ADD_SVG} Log Swim</button>` : ''}
                </div>
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
            </div>

            <div class="dual-grid">
                <!-- 3. Account Details -->
                <div class="glass-panel" id="admin-account-details-panel">
                    <div class="box-header">
                        <h3>${PERSON_SVG} Account Details</h3>
                        ${userPerms.includes('user.manage.advanced') ? `<button id="edit-account-btn" class="small-btn secondary">${EDIT_SVG} Edit</button>` : ''}
                    </div>
                    <div id="account-info-display" class="info-rows">
                        <div class="info-row" style="display:flex; justify-content:space-between; padding: 0.75rem 0; border-bottom: 1px solid rgba(var(--pico-color-rgb), 0.05);">
                            <span style="color: var(--pico-muted-color);">Email</span>
                            <span style="font-weight:600;">${user.email}</span>
                        </div>
                        <div class="info-row" style="display:flex; justify-content:space-between; padding: 0.75rem 0; border-bottom: 1px solid rgba(var(--pico-color-rgb), 0.05);">
                            <span style="color: var(--pico-muted-color);">Phone</span>
                            <span style="font-weight:600;">${user.phone_number || 'N/A'}</span>
                        </div>
                        <div class="info-row" style="display:flex; justify-content:space-between; padding: 0.75rem 0;">
                            <span style="color: var(--pico-muted-color);">College</span>
                            <span style="font-weight:600;">${collegeName}</span>
                        </div>
                    </div>
                    <form id="account-info-form" class="hidden modern-form" style="margin-top: 1rem;">
                        <label>Email <input type="email" id="input-email" value="${user.email}"></label>
                        <label>Phone <input type="tel" id="input-phone" value="${user.phone_number || ''}"></label>
                        <label>College 
                            <select id="input-college">
                                <option value="">Select College</option>
                                ${colleges.map(c => `<option value="${c.id}" ${c.id === user.college_id ? 'selected' : ''}>${c.name}</option>`).join('')}
                            </select>
                        </label>
                        ${canManageUsers ? `
                            <div class="grid-2-col" style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <label>Free Sessions <input type="number" id="input-free-sessions" value="${user.free_sessions}"></label>
                                <label>Swims (Total) <input type="number" id="input-total-swims" value="${user.swims}"></label>
                            </div>
                            <div class="checkbox-group" style="display:flex; gap:1rem; margin-top:0.5rem;">
                                <label><input type="checkbox" id="input-is-member" ${user.is_member ? 'checked' : ''}> Is Member</label>
                                <label><input type="checkbox" id="input-is-instructor" ${user.is_instructor ? 'checked' : ''}> Is Instructor</label>
                            </div>
                        ` : ''}
                        <div class="form-actions" style="display:flex; gap:0.5rem; margin-top:1rem;">
                            <button type="button" id="cancel-account-btn" class="secondary outline small-btn">Cancel</button>
                            <button type="submit" class="primary small-btn">Save</button>
                        </div>
                    </form>
                </div>

                <!-- 4. Instructor & Level -->
                <div class="glass-panel">
                    <div class="box-header">
                        <h3>${BOLT_SVG} Capabilities</h3>
                    </div>
                    <div class="role-toggle" style="margin-bottom: 1.5rem;">
                        <div class="role-info">
                            <h4>Instructor Status</h4>
                            <p style="font-size: 0.85rem; color: var(--pico-muted-color); margin: 0;">Authorized to lead club sessions</p>
                        </div>
                        ${canManageUsers ? `
                            <label class="switch">
                                <input type="checkbox" id="admin-user-instructor" ${user.is_instructor ? 'checked' : ''}>
                                <span class="slider round"></span>
                            </label>
                        ` : `<span class="badge ${user.is_instructor ? 'primary' : 'neutral'}">${user.is_instructor ? 'Yes' : 'No'}</span>`}
                    </div>
                    <div class="difficulty-control">
                        <label style="font-weight: 600; font-size: 0.9rem; margin-bottom: 0.5rem; display: block;">Difficulty Level (1-5)</label>
                        <input type="range" id="admin-user-difficulty" value="${user.difficulty_level || 1}" min="1" max="5" step="1" style="margin-bottom: 0;">
                        <div style="display:flex; justify-content:space-between; font-size: 0.75rem; color: var(--pico-muted-color); margin-top: 0.25rem;">
                            <span>Beginner</span>
                            <span>Advanced</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="dual-grid">
                <!-- 5. System Role -->
                <div class="glass-panel">
                    <div class="box-header">
                        <h3>${ID_CARD_SVG} System Role</h3>
                    </div>
                    <div class="card-body">
                        <p class="small-text" style="margin-bottom: 1rem;">Defines base permissions and access levels.</p>
                        <select id="admin-user-role-select" class="full-width-select" style="margin-bottom:0;">
                            <option value="">No Role</option>
                            <!-- Roles populated dynamically -->
                        </select>
                    </div>
                </div>

                <!-- 6. Direct Permissions -->
                <div class="glass-panel">
                    <div class="box-header">
                        <h3>${SHIELD_SVG} Direct Permissions</h3>
                    </div>
                    <div class="card-body">
                        <p class="small-text" style="margin-bottom: 1rem;">Explicitly granted permissions (overrides role).</p>
                        <div class="inline-add-form" style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                            <select id="add-perm-select" style="margin-bottom: 0;">
                                <option value="">Select Permission...</option>
                            </select>
                            <button id="add-perm-btn" class="icon-btn primary small-btn">${ADD_SVG}</button>
                        </div>
                        <div id="direct-perms-list" class="tags-cloud">
                            ${(user.direct_permissions || []).map(p => `
                                <span class="tag-chip neutral" style="background: rgba(var(--pico-color-rgb), 0.1); border-radius: 20px; padding: 0.2rem 0.75rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.5rem; color: var(--pico-color); border: 1px solid rgba(var(--pico-color-rgb), 0.1);">
                                    ${p.slug} 
                                    <button class="remove-perm-btn delete-icon-btn" data-id="${p.id}" style="background:none; border:none; padding:0; color:var(--pico-muted-color); cursor:pointer; display:flex; align-items:center; height: 1.25rem; width: 1.25rem; justify-content: center;">${CLOSE_SVG}</button>
                                </span>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
    `;

    // Role Loading & Binding
    if (canManageUsers) {
        const roleSelect = document.getElementById('admin-user-role-select');
        if (roleSelect) {
            const allRoles = await ajaxGet('/api/admin/roles').catch(() => []);
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
                    await ajaxPost(`/api/admin/user/${user.id}/role`, { roleId: roleSelect.value, password });
                    notify('Success', 'Role updated', 'success');
                    lastValue = roleSelect.value;
                    if (isPresident) {
                        renderUserDetail(user.id);
                    }
                } catch (e) {
                    notify('Error', e.message || 'Failed to update role', 'error');
                    roleSelect.value = lastValue;
                }
            };
        }

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

        // Direct Permissions Logic
        const permSelect = document.getElementById('add-perm-select');
        if (permSelect) {
            const allPerms = await ajaxGet('/api/admin/permissions').catch(() => []);
            permSelect.innerHTML += allPerms.map(p => `<option value="${p.id}">${p.slug}</option>`).join('');

            document.getElementById('add-perm-btn').onclick = async () => {
                const permId = permSelect.value;
                if (!permId) return;
                try {
                    await ajaxPost(`/api/admin/user/${user.id}/permission`, { permissionId: permId });
                    notify('Success', 'Permission added', 'success');
                    const updatedUser = await ajaxGet(`/api/admin/user/${user.id}`);
                    renderProfileTab(container, updatedUser, userPerms, canManageUsers, isExec);
                } catch (e) { notify('Error', 'Failed to add permission', 'error'); }
            };

            container.querySelectorAll('.remove-perm-btn').forEach(btn => {
                btn.onclick = async () => {
                    try {
                        await ajaxDelete(`/api/admin/user/${user.id}/permission/${btn.dataset.id}`);
                        notify('Success', 'Permission removed', 'success');
                        const updatedUser = await ajaxGet(`/api/admin/user/${user.id}`);
                        renderProfileTab(container, updatedUser, userPerms, canManageUsers, isExec);
                    } catch (e) { notify('Error', 'Failed to remove', 'error'); }
                };
            });
        }

        // Account Details Edit Logic
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

            cancelBtn.onclick = closeEdit;

            form.onsubmit = async (e) => {
                e.preventDefault();
                const updateData = {
                    email: document.getElementById('input-email').value,
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
                    await ajaxPost(`/api/admin/user/${user.id}/elements`, updateData);
                    notify('Success', 'Account details updated', 'success');
                    // Refresh view
                    Object.assign(user, updateData);
                    renderProfileTab(container, user, userPerms, canManageUsers, isExec);
                } catch (err) {
                    notify('Error', err.message, 'error');
                }
            };
        }

        const balanceCard = document.getElementById('admin-profile-balance-card');
        if (balanceCard) {
            balanceCard.onclick = () => {
                const txTab = document.querySelector('button[data-tab="transactions"]');
                if (txTab) txTab.click();
            };
        }

        if (canManageSwims) {
            document.getElementById('admin-add-swim-btn').onclick = async () => {
                try {
                    await ajaxPost(`/api/user/${user.id}/swims`, { count: 1 });

                    // Refresh swimmer stats from the server to get updated ranks
                    const statsRes = await ajaxGet(`/api/user/${user.id}/elements/swimmer_rank`);
                    if (statsRes.swimmer_stats) {
                        user.swimmer_stats = statsRes.swimmer_stats;
                    }

                    // Update UI elements
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

        const difficultyInput = document.getElementById('admin-user-difficulty');
        if (difficultyInput) {
            difficultyInput.onchange = async () => {
                try {
                    await ajaxPost(`/api/admin/user/${user.id}/elements`, { difficulty_level: difficultyInput.value });
                    notify('Success', 'Difficulty level updated', 'success');
                } catch (e) {
                    notify('Error', 'Failed to update level', 'error');
                }
            };
        }
    }
}

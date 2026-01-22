import { ajaxGet, ajaxPost, ajaxPut, ajaxDelete } from '/js/utils/ajax.js';
import { switchView } from '/js/utils/view.js';
import { adminContentID } from '../common.js';
import { notify } from '/js/components/notification.js';
import { ARROW_BACK_IOS_NEW_SVG, CLOSE_SVG, ADD_SVG, PERSON_SVG, SHIELD_SVG } from "../../../../images/icons/outline/icons.js"

/**
 * Advanced user management (Direct permissions, Profile edits).
 * @module AdminUserAdvanced
 */

/**
 * Render advanced user management page.
 * @param {string} userId
 */
export async function renderUserAdvanced(userId) {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    const actionsEl = document.getElementById('admin-header-actions');
    if (actionsEl) actionsEl.innerHTML = `<button data-nav="/admin/user/${userId}" class="small-btn outline secondary icon-text-btn">${ARROW_BACK_IOS_NEW_SVG} Back to User</button>`;

    adminContent.innerHTML = '<p class="loading-text">Loading...</p>';

    try {
        const [user, allPerms, allTagsRes, colleges] = await Promise.all([
            ajaxGet(`/api/admin/user/${userId}`),
            ajaxGet('/api/admin/permissions').catch(() => []),
            ajaxGet('/api/tags').catch(() => ({ data: [] })),
            ajaxGet('/api/colleges').catch(() => [])
        ]);
        const allTags = allTagsRes.data || [];

        adminContent.innerHTML = /*html*/`
            <div class="glass-layout">
                <header class="glass-panel" style="margin-bottom:0; display:flex; justify-content:space-between; align-items:center;">
                    <h2 style="margin:0;">Advanced Settings: ${user.first_name} ${user.last_name}</h2>
                </header>
                
                <div class="profile-layout-grid">
                    <div class="column">
                        <div class="detail-card">
                            <header><h3>${PERSON_SVG} Profile Override</h3></header>
                            <div class="card-body">
                                <form id="advanced-profile-form" class="modern-form">
                                    <label>Email <input type="email" name="email" value="${user.email}"></label>
                                    <label>Phone <input type="text" name="phone_number" value="${user.phone_number || ''}"></label>
                                    <label>College 
                                        <select name="college_id" class="modern-select">
                                            <option value="">Select College</option>
                                            ${colleges.map(c => `<option value="${c.id}" ${c.id === user.college_id ? 'selected' : ''}>${c.name}</option>`).join('')}
                                        </select>
                                    </label>
                                    <div class="grid-3-col">
                                        <label>Free Sessions <input type="number" name="free_sessions" value="${user.free_sessions}"></label>
                                        <label>Difficulty <input type="number" name="difficulty_level" value="${user.difficulty_level}" min="1" max="5"></label>
                                        <label>Swims <input type="number" name="swims" value="${user.swims}"></label>
                                    </div>
                                    <div class="checkbox-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" name="is_member" ${user.is_member ? 'checked' : ''}> Is Member
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" name="is_instructor" ${user.is_instructor ? 'checked' : ''}> Is Instructor
                                        </label>
                                    </div>
                                    <button type="submit" class="primary-btn wide-btn">Save Profile</button>
                                </form>
                            </div>
                        </div>
                    </div>

                    <div class="column">
                        <div class="detail-card">
                            <header><h3>${SHIELD_SVG} Advanced Permissions</h3></header>
                            <div class="card-body">
                                <p class="helper-text">Directly assign specific permissions (overrides role).</p>
                                
                                <h4>Direct Permissions</h4>
                                <div class="inline-add-form" style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                                    <select id="add-perm-select" class="modern-select compact" style="margin-bottom: 0;">
                                        <option value="">Select Permission...</option>
                                        ${allPerms.map(p => `<option value="${p.id}">${p.slug}</option>`).join('')}
                                    </select>
                                    <button id="add-perm-btn" class="icon-btn primary small-btn">${ADD_SVG}</button>
                                </div>
                                <div id="direct-perms-list" class="tags-cloud">
                                    ${(user.direct_permissions || []).map(p => `
                                        <span class="tag-chip neutral">
                                            ${p.slug} 
                                            <button class="remove-perm-btn delete-icon-btn" data-id="${p.id}">${CLOSE_SVG}</button>
                                        </span>
                                    `).join('')}
                                </div>

                                <div class="divider" style="height:1px; background:rgba(128,128,128,0.2); margin:1.5rem 0;"></div>

                                <h4>Managed Tags (Scoped)</h4>
                                <div class="inline-add-form" style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                                    <select id="add-managed-tag-select" class="modern-select compact" style="margin-bottom: 0;">
                                        <option value="">Select Tag...</option>
                                        ${allTags.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                                    </select>
                                    <button id="add-managed-tag-btn" class="icon-btn primary small-btn">${ADD_SVG}</button>
                                </div>
                                <div id="managed-tags-list" class="tags-cloud">
                                    ${(user.direct_managed_tags || []).map(t => `
                                        <span class="tag-chip" style="background-color: ${t.color};">
                                            ${t.name}
                                            <button class="remove-managed-tag-btn delete-icon-btn" data-id="${t.id}">${CLOSE_SVG}</button>
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Profile Form Handler
        document.getElementById('advanced-profile-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.is_member = !!formData.get('is_member');
            data.is_instructor = !!formData.get('is_instructor');
            data.college_id = parseInt(data.college_id) || null;

            // Clean up empty strings
            if (!data.phone_number) data.phone_number = null;

            try {
                await ajaxPost(`/api/admin/user/${userId}/elements`, data);
                notify('Success', 'Profile updated', 'success');
            } catch (err) {
                notify('Error', 'Update failed', 'error');
            }
        };

        // Permission Handlers
        document.getElementById('add-perm-btn').onclick = async () => {
            const permId = document.getElementById('add-perm-select').value;
            if (!permId) return;
            try {
                await ajaxPost(`/api/admin/user/${userId}/permission`, { permissionId: permId });
                notify('Success', 'Permission added', 'success');
                renderUserAdvanced(userId); // Refresh
            } catch (e) { notify('Error', 'Failed', 'error'); }
        };

        const container = adminContent;
        container.querySelectorAll('.remove-perm-btn').forEach(btn => {
            btn.onclick = async () => {
                try {
                    await fetch(`/api/admin/user/${userId}/permission/${btn.dataset.id}`, { method: 'DELETE' });
                    notify('Success', 'Removed', 'success');
                    renderUserAdvanced(userId); // Refresh
                } catch (e) { notify('Error', 'Failed', 'error'); }
            }
        });

        // Tag Handlers
        document.getElementById('add-managed-tag-btn').onclick = async () => {
            const tagId = document.getElementById('add-managed-tag-select').value;
            if (!tagId) return;
            try {
                await ajaxPost(`/api/admin/user/${userId}/managed_tag`, { tagId });
                notify('Success', 'Tag scope added', 'success');
                renderUserAdvanced(userId); // Refresh
            } catch (e) { notify('Error', 'Failed', 'error'); }
        };

        container.querySelectorAll('.remove-managed-tag-btn').forEach(btn => {
            btn.onclick = async () => {
                try {
                    await fetch(`/api/admin/user/${userId}/managed_tag/${btn.dataset.id}`, { method: 'DELETE' });
                    notify('Success', 'Removed', 'success');
                    renderUserAdvanced(userId); // Refresh
                } catch (e) { notify('Error', 'Failed', 'error'); }
            }
        });

    } catch (e) {
        console.error(e);
        adminContent.innerHTML = '<p class="error-text">Failed to load advanced settings.</p>';
    }
}

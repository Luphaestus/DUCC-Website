import { ajaxGet, ajaxPost, ajaxPut, ajaxDelete } from '/js/utils/ajax.js';
import { switchView } from '/js/utils/view.js';
import { adminContentID } from '../common.js';
import { notify } from '/js/components/notification.js';
import { ARROW_BACK_IOS_NEW_SVG, CLOSE_SVG } from "../../../../images/icons/outline/icons.js"

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
    if (actionsEl) actionsEl.innerHTML = `<button data-nav="/admin/user/${userId}">${ARROW_BACK_IOS_NEW_SVG} Back to User</button>`;

    adminContent.innerHTML = '<p aria-busy="true">Loading...</p>';

    try {
        const [user, allPerms, allTagsRes, colleges] = await Promise.all([
            ajaxGet(`/api/admin/user/${userId}`),
            ajaxGet('/api/admin/permissions').catch(() => []),
            ajaxGet('/api/tags').catch(() => ({ data: [] })),
            ajaxGet('/api/admin/colleges').catch(() => [])
        ]);
        const allTags = allTagsRes.data || [];

        adminContent.innerHTML = /*html*/`
            <div class="form-info">
                <article class="form-box">
                    <h2>Advanced Settings: ${user.first_name} ${user.last_name}</h2>
                    
                    <div class="grid">
                        <div>
                            <h3>Profile</h3>
                            <form id="advanced-profile-form">
                                <label>Email <input type="email" name="email" value="${user.email}"></label>
                                <label>Phone <input type="text" name="phone_number" value="${user.phone_number || ''}"></label>
                                <label>College 
                                    <select name="college_id">
                                        <option value="">Select College</option>
                                        ${colleges.map(c => `<option value="${c.id}" ${c.id === user.college_id ? 'selected' : ''}>${c.name}</option>`).join('')}
                                    </select>
                                </label>
                                <div class="grid">
                                    <label>Free Sessions <input type="number" name="free_sessions" value="${user.free_sessions}"></label>
                                    <label>Difficulty <input type="number" name="difficulty_level" value="${user.difficulty_level}" min="1" max="5"></label>
                                    <label>Swims <input type="number" name="swims" value="${user.swims}"></label>
                                </div>
                                <label>
                                    <input type="checkbox" name="is_member" ${user.is_member ? 'checked' : ''}> Is Member
                                </label>
                                <label>
                                    <input type="checkbox" name="is_instructor" ${user.is_instructor ? 'checked' : ''}> Is Instructor
                                </label>
                                <button type="submit" class="primary">Save Profile</button>
                            </form>
                        </div>

                        <div>
                            <h3>Advanced Permissions</h3>
                            <p class="small-text">Directly assign permissions (Overrides).</p>
                            
                            <h4>Direct Permissions</h4>
                            <div class="flex-row">
                                <select id="add-perm-select">
                                    <option value="">Select Permission...</option>
                                    ${allPerms.map(p => `<option value="${p.id}">${p.slug}</option>`).join('')}
                                </select>
                                <button id="add-perm-btn" class="small-btn">Add</button>
                            </div>
                            <div id="direct-perms-list" class="tags-list">
                                ${(user.direct_permissions || []).map(p => `
                                    <span class="tag-badge">
                                        ${p.slug} 
                                        <button class="remove-perm-btn small-icon-btn" data-id="${p.id}">${CLOSE_SVG}</button>
                                    </span>
                                `).join('')}
                            </div>

                            <h4 style="margin-top: 1rem;">Managed Tags (Scoped)</h4>
                            <div class="flex-row">
                                <select id="add-managed-tag-select">
                                    <option value="">Select Tag...</option>
                                    ${allTags.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                                </select>
                                <button id="add-managed-tag-btn" class="small-btn">Add</button>
                            </div>
                            <div id="managed-tags-list" class="tags-list">
                                ${(user.direct_managed_tags || []).map(t => `
                                    <span class="tag-badge" style="background-color: ${t.color};">
                                        ${t.name}
                                        <button class="remove-managed-tag-btn small-icon-btn" data-id="${t.id}">${CLOSE_SVG}</button>
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </article>
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

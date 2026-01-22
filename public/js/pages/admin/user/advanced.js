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
        const managedTags = user.direct_managed_tags || [];

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
                                <p class="helper-text">Tags this user can manage events for.</p>
                                <div class="tags-selection-grid" style="display:flex; flex-wrap:wrap; gap:0.75rem; margin-top:1rem;">
                                    ${allTags.map(tag => {
                                        const isManaged = managedTags.some(t => t.id === tag.id);
                                        return `
                                            <label class="tag-checkbox" style="cursor:pointer; display:flex; align-items:center;">
                                                <input type="checkbox" class="managed-tag-cb" value="${tag.id}" ${isManaged ? 'checked' : ''} style="display:none;">
                                                <span class="tag-badge ${isManaged ? 'selected' : ''}" 
                                                      style="background-color: ${tag.color}; opacity: ${isManaged ? '1' : '0.4'}; transition: all 0.2s; border: 2px solid transparent; 
                                                             padding: 0.4rem 0.8rem; border-radius: 20px; font-weight: 600; color: white;
                                                             ${isManaged ? 'box-shadow: 0 0 0 2px white, 0 0 0 4px var(--pico-primary); transform: scale(1.05);' : ''}">
                                                    ${tag.name}
                                                </span>
                                            </label>
                                        `;
                                    }).join('')}
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

        // Scoped Tag Handlers (Toggle Style)
        container.querySelectorAll('.managed-tag-cb').forEach(cb => {
            cb.onchange = async () => {
                const tagId = cb.value;
                const isAdding = cb.checked;
                const span = cb.nextElementSibling;

                try {
                    if (isAdding) {
                        await ajaxPost(`/api/admin/user/${userId}/managed_tag`, { tagId });
                        span.style.opacity = '1';
                        span.style.transform = 'scale(1.05)';
                        span.style.boxShadow = '0 0 0 2px white, 0 0 0 4px var(--pico-primary)';
                        notify('Success', 'Tag scope added', 'success');
                    } else {
                        await fetch(`/api/admin/user/${userId}/managed_tag/${tagId}`, { method: 'DELETE' });
                        span.style.opacity = '0.4';
                        span.style.transform = 'scale(1)';
                        span.style.boxShadow = 'none';
                        notify('Success', 'Tag scope removed', 'success');
                    }
                } catch (e) {
                    cb.checked = !isAdding; // Revert UI
                    notify('Error', 'Update failed', 'error');
                }
            };
        });

    } catch (e) {
        console.error(e);
        adminContent.innerHTML = '<p class="error-text">Failed to load advanced settings.</p>';
    }
}

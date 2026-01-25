//todo refine
/**
 * tags.js (Admin User Tab)
 * 
 * Renders the "Tags" tab within the administrative user management view.
 * Allows admins to manage a user's whitelisted tag access and their
 * "Designated Manager" status for specific event categories.
 */

import { apiRequest } from '/js/utils/api.js';
import { notify } from '/js/components/notification.js';
import { Panel } from '/js/widgets/panel.js';
import { LOCAL_ACTIVITY_SVG, SHIELD_SVG } from '../../../../../images/icons/outline/icons.js';

/**
 * Main rendering and logic binding function for the Admin Tags tab.
 * 
 * @param {HTMLElement} container - Tab content area.
 * @param {number|string} userId - ID of the user being managed.
 */
export async function renderTagsTab(container, userId) {
    container.innerHTML = '<p class="loading-text">Loading tags...</p>';
    try {
        // Fetch all available tags and the user's specific associations in parallel
        const [allTagsData, userWhitelistedTags, userDetails] = await Promise.all([
            apiRequest('GET', '/api/tags'),
            apiRequest('GET', `/api/user/${userId}/tags`),
            apiRequest('GET', `/api/admin/user/${userId}`)
        ]);

        const allTags = allTagsData.data || [];
        const managedTags = userDetails.direct_managed_tags || [];

        container.innerHTML = `
        <div class="profile-layout-grid">
            <!-- Whitelist Management -->
            <div class="column">
                ${Panel({
                    title: 'Whitelisted Tags',
                    icon: LOCAL_ACTIVITY_SVG,
                    content: `
                        <div class="card-body">
                            <p class="helper-text">Tags this user is explicitly whitelisted for.</p>
                            <div class="tags-selection-grid">
                                ${allTags.map(tag => {
                                    const isWhitelisted = userWhitelistedTags.some(ut => ut.id === tag.id);
                                    return `
                                        <label class="tag-checkbox">
                                            <input type="checkbox" class="user-tag-cb" value="${tag.id}" ${isWhitelisted ? 'checked' : ''} style="display:none;">
                                            <span class="tag-badge ${isWhitelisted ? 'selected' : ''}" 
                                                  style="--tag-color: ${tag.color}; background-color: var(--tag-color);">
                                                ${tag.name}
                                            </span>
                                        </label>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `
                })}
            </div>

            <!-- Management Scope Management -->
            <div class="column">
                ${Panel({
                    title: 'Managed Tags (Scoped)',
                    icon: SHIELD_SVG,
                    content: `
                        <div class="card-body">
                            <p class="helper-text">Tags this user can manage events for.</p>
                            <div class="tags-selection-grid">
                                ${allTags.map(tag => {
                                    const isManaged = managedTags.some(t => t.id === tag.id);
                                    return `
                                        <label class="tag-checkbox">
                                            <input type="checkbox" class="managed-tag-cb" value="${tag.id}" ${isManaged ? 'checked' : ''} style="display:none;">
                                            <span class="tag-badge ${isManaged ? 'selected' : ''}" 
                                                  style="--tag-color: ${tag.color}; background-color: var(--tag-color);">
                                                ${tag.name}
                                            </span>
                                        </label>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `
                })}
            </div>
        </div>`;

        // --- Whitelist Toggle Handlers ---
        container.querySelectorAll('.user-tag-cb').forEach(cb => {
            cb.onchange = async () => {
                const tagId = cb.value;
                const isAdding = cb.checked;
                const span = cb.nextElementSibling;

                try {
                    if (isAdding) {
                        await apiRequest('POST', `/api/tags/${tagId}/whitelist`, { userId });
                        span.classList.add('selected');
                    } else {
                        await apiRequest('DELETE', `/api/tags/${tagId}/whitelist/${userId}`);
                        span.classList.remove('selected');
                    }
                } catch (e) {
                    cb.checked = !isAdding; // Revert UI
                    notify('Error', 'Update failed', 'error');
                }
            };
        });

        // --- Managed Tag Toggle Handlers ---
        container.querySelectorAll('.managed-tag-cb').forEach(cb => {
            cb.onchange = async () => {
                const tagId = cb.value;
                const isAdding = cb.checked;
                const span = cb.nextElementSibling;

                try {
                    if (isAdding) {
                        await apiRequest('POST', `/api/admin/user/${userId}/managed_tag`, { tagId });
                        span.classList.add('selected');
                        notify('Success', 'Tag scope added', 'success');
                    } else {
                        await apiRequest('DELETE', `/api/admin/user/${userId}/managed_tag/${tagId}`);
                        span.classList.remove('selected');
                        notify('Success', 'Tag scope removed', 'success');
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
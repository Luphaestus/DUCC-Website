/**
 * tags.js (Admin User Tab)
 * 
 * Renders the "Tags" tab within the administrative user management view.
 */

import { apiRequest } from '/js/utils/api.js';
import { notify } from '/js/components/notification.js';
import { Panel } from '/js/widgets/panel.js';
import { LOCAL_ACTIVITY_SVG, SHIELD_SVG } from '../../../../../images/icons/outline/icons.js';

/**
 * Main rendering and logic binding function for the Admin Tags tab.
 */
export async function renderTagsTab(container, userId) {
    container.innerHTML = '<p class="loading-text">Loading tags...</p>';
    try {
        const [allTagsData, userWhitelistedTags, userDetails] = await Promise.all([
            apiRequest('GET', '/api/tags'),
            apiRequest('GET', `/api/user/${userId}/tags`),
            apiRequest('GET', `/api/admin/user/${userId}`)
        ]);

        const allTags = allTagsData.data || [];
        const managedTags = userDetails.direct_managed_tags || [];

        const renderTagGrid = (activeTags, inputClass, helperText) => `
            <div class="card-body">
                <p class="helper-text">${helperText}</p>
                <div class="tags-selection-grid">
                    ${allTags.map(tag => {
                        const isActive = activeTags.some(t => t.id === tag.id);
                        return `
                            <label class="tag-checkbox">
                                <input type="checkbox" class="${inputClass}" value="${tag.id}" ${isActive ? 'checked' : ''} style="display:none;">
                                <span class="tag-badge ${isActive ? 'selected' : ''}" 
                                      style="--tag-color: ${tag.color}; background-color: var(--tag-color);">
                                    ${tag.name}
                                </span>
                            </label>`;
                    }).join('')}
                </div>
            </div>`;

        container.innerHTML = `
            <div class="profile-layout-grid">
                <div class="column">
                    ${Panel({
                        title: 'Whitelisted Tags',
                        icon: LOCAL_ACTIVITY_SVG,
                        content: renderTagGrid(userWhitelistedTags, 'user-tag-cb', 'Tags this user is explicitly whitelisted for.')
                    })}
                </div>
                <div class="column">
                    ${Panel({
                        title: 'Managed Tags (Scoped)',
                        icon: SHIELD_SVG,
                        content: renderTagGrid(managedTags, 'managed-tag-cb', 'Tags this user can manage events for.')
                    })}
                </div>
            </div>`;

        const bindToggle = (selector, apiConfig) => {
            container.querySelectorAll(selector).forEach(cb => {
                cb.onchange = async () => {
                    const tagId = cb.value;
                    const isAdding = cb.checked;
                    const span = cb.nextElementSibling;
                    const { method, url, body, successMsg } = apiConfig(tagId, isAdding);

                    try {
                        await apiRequest(method, url, body);
                        span.classList.toggle('selected', isAdding);
                        if (successMsg) notify('Success', successMsg, 'success');
                    } catch (e) {
                        cb.checked = !isAdding;
                        notify('Error', 'Update failed', 'error');
                    }
                };
            });
        };

        bindToggle('.user-tag-cb', (tagId, isAdding) => ({
            method: isAdding ? 'POST' : 'DELETE',
            url: isAdding ? `/api/tags/${tagId}/whitelist` : `/api/tags/${tagId}/whitelist/${userId}`,
            body: isAdding ? { userId } : {},
            successMsg: isAdding ? 'User whitelisted' : 'Whitelist removed'
        }));

        bindToggle('.managed-tag-cb', (tagId, isAdding) => ({
            method: isAdding ? 'POST' : 'DELETE',
            url: isAdding ? `/api/admin/user/${userId}/managed_tag` : `/api/admin/user/${userId}/managed_tag/${tagId}`,
            body: isAdding ? { tagId } : {},
            successMsg: isAdding ? 'Tag scope added' : 'Tag scope removed'
        }));

    } catch (e) {
        container.innerHTML = '<p class="error-text">Failed to load tags.</p>';
    }
}

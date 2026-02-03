/**
 * tags.js (Admin User Tab)
 * 
 * Renders the "Tags" tab within the administrative user management view.
 */

import { apiRequest } from '@/utils/api';
import { notify } from '@/components/notification';
import { Panel } from '@/widgets/panel';
import { LOCAL_ACTIVITY_SVG, SHIELD_SVG } from '@/utils/icons';

/**
 * Main rendering and logic binding function for the Admin Tags tab.
 * 
 * @param {HTMLElement} container 
 * @param {string | number} userId 
 */
export async function renderTagsTab(container: HTMLElement, userId: string | number): Promise<void> {
    container.innerHTML = '<p class="loading-text">Loading tags...</p>';
    try {
        const [allTagsData, userWhitelistedTags, userDetails] = await Promise.all([
            apiRequest('GET', '/api/tags'),
            apiRequest('GET', `/api/user/${userId}/tags`),
            apiRequest('GET', `/api/admin/user/${userId}`)
        ]);

        const allTags: any[] = allTagsData.data || [];
        const managedTags: any[] = userDetails.direct_managed_tags || [];

        const renderTagGrid = (activeTags: any[], inputClass: string, helperText: string) => `
            <div class="card-body">
                <p class="helper-text">${helperText}</p>
                <div class="tags-selection-grid">
                    ${allTags.map(tag => {
                        const isActive = activeTags.some((t: any) => t.id === tag.id);
                        return `
                            <label class="tag-checkbox">
                                <input type="checkbox" class="${inputClass}" value="${tag.id}" ${isActive ? 'checked' : ''} style="display:none;">
                                <span class="tag-badge ${isActive ? 'selected' : ''}" 
                                      style="--tag-colour: ${tag.color}; background-color: var(--tag-colour);">
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

        const bindToggle = (selector: string, apiConfig: (tagId: string, isAdding: boolean) => any) => {
            container.querySelectorAll(selector).forEach(el => {
                const cb = el as HTMLInputElement;
                cb.onchange = async () => {
                    const tagId = cb.value;
                    const isAdding = cb.checked;
                    const span = cb.nextElementSibling as HTMLElement;
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

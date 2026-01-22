import { ajaxGet, ajaxPost, ajaxDelete } from '/js/utils/ajax.js';
import { notify } from '/js/components/notification.js';
import { LOCAL_ACTIVITY_SVG, SHIELD_SVG } from '../../../../../images/icons/outline/icons.js';

/**
 * Fetches and renders the tags tab for the user.
 */
export async function renderTagsTab(container, userId) {
    container.innerHTML = '<p class="loading-text">Loading tags...</p>';
    try {
        const [allTagsData, userWhitelistedTags, userDetails] = await Promise.all([
            ajaxGet('/api/tags'),
            ajaxGet(`/api/user/${userId}/tags`),
            ajaxGet(`/api/admin/user/${userId}`)
        ]);

        const allTags = allTagsData.data || [];
        const managedTags = userDetails.direct_managed_tags || [];

        container.innerHTML = `
        <div class="profile-layout-grid">
            <div class="column">
                <div class="detail-card">
                    <header>
                        ${LOCAL_ACTIVITY_SVG}
                        <h3>Whitelisted Tags</h3>
                    </header>
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
                </div>
            </div>

            <div class="column">
                <div class="detail-card">
                    <header>
                        ${SHIELD_SVG}
                        <h3>Managed Tags (Scoped)</h3>
                    </header>
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
                </div>
            </div>
        </div>`;

        // Whitelist Toggle Handlers
        container.querySelectorAll('.user-tag-cb').forEach(cb => {
            cb.onchange = async () => {
                const tagId = cb.value;
                const isAdding = cb.checked;
                const span = cb.nextElementSibling;

                try {
                    if (isAdding) {
                        await ajaxPost(`/api/tags/${tagId}/whitelist`, { userId });
                        span.classList.add('selected');
                    } else {
                        await ajaxDelete(`/api/tags/${tagId}/whitelist/${userId}`);
                        span.classList.remove('selected');
                    }
                } catch (e) {
                    cb.checked = !isAdding;
                    notify('Error', 'Update failed', 'error');
                }
            };
        });

        // Managed Tag Toggle Handlers
        container.querySelectorAll('.managed-tag-cb').forEach(cb => {
            cb.onchange = async () => {
                const tagId = cb.value;
                const isAdding = cb.checked;
                const span = cb.nextElementSibling;

                try {
                    if (isAdding) {
                        await ajaxPost(`/api/admin/user/${userId}/managed_tag`, { tagId });
                        span.classList.add('selected');
                        notify('Success', 'Tag scope added', 'success');
                    } else {
                        await ajaxDelete(`/api/admin/user/${userId}/managed_tag/${tagId}`);
                        span.classList.remove('selected');
                        notify('Success', 'Tag scope removed', 'success');
                    }
                } catch (e) {
                    cb.checked = !isAdding;
                    notify('Error', 'Update failed', 'error');
                }
            };
        });

    } catch (e) {
        container.innerHTML = '<p class="error-text">Failed to load tags.</p>';
    }
}
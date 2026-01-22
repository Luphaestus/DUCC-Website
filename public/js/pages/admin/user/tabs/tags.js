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
                        <div class="tags-selection-grid" style="display:flex; flex-wrap:wrap; gap:0.75rem; margin-top:1.5rem;">
                            ${allTags.map(tag => {
                                const isWhitelisted = userWhitelistedTags.some(ut => ut.id === tag.id);
                                return `
                                    <label class="tag-checkbox" style="cursor:pointer; display:flex; align-items:center;">
                                        <input type="checkbox" class="user-tag-cb" value="${tag.id}" ${isWhitelisted ? 'checked' : ''} style="display:none;">
                                        <span class="tag-badge ${isWhitelisted ? 'selected' : ''}" 
                                              style="background-color: ${tag.color}; opacity: ${isWhitelisted ? '1' : '0.4'}; transition: all 0.2s; border: 2px solid transparent; 
                                                     padding: 0.4rem 0.8rem; border-radius: 20px; font-weight: 600; color: white;
                                                     ${isWhitelisted ? 'box-shadow: 0 0 0 2px white, 0 0 0 4px var(--pico-primary); transform: scale(1.05);' : ''}">
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
                        <div class="tags-selection-grid" style="display:flex; flex-wrap:wrap; gap:0.75rem; margin-top:1.5rem;">
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
                        span.style.opacity = '1';
                        span.style.transform = 'scale(1.05)';
                        span.style.boxShadow = '0 0 0 2px white, 0 0 0 4px var(--pico-primary)';
                    } else {
                        await ajaxDelete(`/api/tags/${tagId}/whitelist/${userId}`);
                        span.style.opacity = '0.4';
                        span.style.transform = 'scale(1)';
                        span.style.boxShadow = 'none';
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
                        span.style.opacity = '1';
                        span.style.transform = 'scale(1.05)';
                        span.style.boxShadow = '0 0 0 2px white, 0 0 0 4px var(--pico-primary)';
                        notify('Success', 'Tag scope added', 'success');
                    } else {
                        await ajaxDelete(`/api/admin/user/${userId}/managed_tag/${tagId}`);
                        span.style.opacity = '0.4';
                        span.style.transform = 'scale(1)';
                        span.style.boxShadow = 'none';
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
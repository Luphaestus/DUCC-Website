import { ajaxGet } from '/js/utils/ajax.js';
import { switchView } from '/js/utils/view.js';
import { adminContentID, renderAdminNavBar } from '../common.js';

/**
 * Admin tag management list.
 * @module AdminTagManage
 */

/**
 * Render tag management interface.
 */
export async function renderManageTags() {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    adminContent.innerHTML = /*html*/`
        <div class="glass-layout">
            <div class="glass-toolbar justify-end">
                 ${await renderAdminNavBar('tags')}
                 <div class="toolbar-content">
                    <div class="toolbar-left"></div>
                    <div class="toolbar-right">
                        <button data-nav="/admin/tag/new" class="small-btn primary">Create New Tag</button>
                    </div>
                </div>
            </div>
            
            <div class="glass-table-container">
                <div class="table-responsive">
                    <table class="glass-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Color</th>
                                <th>Min Difficulty</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody id="tags-table-body">
                            <tr><td colspan="4" class="loading-cell">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    await fetchAndRenderTags();
}

/**
 * Fetch and render tags list.
 */
async function fetchAndRenderTags() {
    try {
        const data = (await ajaxGet('/api/tags')).data;
        const tags = data || [];
        const tbody = document.getElementById('tags-table-body');

        if (tags.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">No tags found.</td></tr>';
        } else {
            tbody.innerHTML = tags.map(tag => `
                <tr class="tag-row clickable-row" data-id="${tag.id}">
                    <td data-label="Name" class="primary-text">${tag.name}</td>
                    <td data-label="Color">
                        <span class="tag-badge" style="--tag-color: ${tag.color}; background-color: var(--tag-color);">
                            ${tag.color}
                        </span>
                    </td>
                    <td data-label="Min Difficulty"><span class="badge ${tag.min_difficulty ? `difficulty-${tag.min_difficulty}` : 'neutral'}">${tag.min_difficulty || '-'}</span></td>
                    <td data-label="Description" class="description-cell">${tag.description || '-'}</td>
                </tr>
            `).join('');

            tbody.querySelectorAll('.tag-row').forEach(row => {
                row.onclick = () => switchView(`/admin/tag/${row.dataset.id}`);
            });
        }
    } catch (e) {
        const tbody = document.getElementById('tags-table-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="error-cell">Error loading tags.</td></tr>';
    }
}
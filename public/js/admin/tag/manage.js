import { ajaxGet } from '../../misc/ajax.js';
import { switchView } from '../../misc/view.js';
import { adminContentID, renderAdminNavBar } from '../common.js';

export async function renderManageTags() {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    adminContent.innerHTML = `
        <div class="form-info">
            <article class="form-box">
                <div class="admin-controls-bar">
                    ${await renderAdminNavBar('tags')}
                    <div class="admin-actions">
                        <button onclick="switchView('/admin/tag/new')" class="primary">Create New Tag</button>
                    </div>
                </div>
                <div>
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Color</th>
                                <th>Min Difficulty</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody id="tags-table-body">
                            <tr><td colspan="4">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </article>
        </div>
    `;

    await fetchAndRenderTags();
}

async function fetchAndRenderTags() {
    try {
        const data = (await ajaxGet('/api/tags')).data;
        const tags = data || [];
        const tbody = document.getElementById('tags-table-body');

        if (tags.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">No tags found.</td></tr>';
        } else {
            tbody.innerHTML = tags.map(tag => `
                <tr class="tag-row" data-id="${tag.id}" style="cursor: pointer;">
                    <td>${tag.name}</td>
                    <td><span style="background-color: ${tag.color}; padding: 2px 8px; border-radius: 4px; color: white; text-shadow: 0 0 2px black;">${tag.color}</span></td>
                    <td>${tag.min_difficulty || '-'}</td>
                    <td>${tag.description || ''}</td>
                </tr>
            `).join('');

            tbody.querySelectorAll('.tag-row').forEach(row => {
                row.onclick = () => switchView(`/admin/tag/${row.dataset.id}`);
            });
        }
    } catch (e) {
        console.error(e);
        const tbody = document.getElementById('tags-table-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="4">Error loading tags.</td></tr>';
    }
}

import { ajaxGet, ajaxPost, ajaxPut, ajaxDelete } from '../../misc/ajax.js';
import { switchView } from '../../misc/view.js';
import { adminContentID } from '../common.js';
import { notify, NotificationTypes } from '../../misc/notification.js';

/**
 * Admin tag creation and editing form.
 * @module AdminTagDetail
 */

/**
 * Render tag detail/editor form.
 * @param {string} id
 */
export async function renderTagDetail(id) {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    const actionsEl = document.getElementById('admin-header-actions');
    if (actionsEl) actionsEl.innerHTML = '<button id="admin-back-btn">&larr; Back to Tags</button>';
    document.getElementById('admin-back-btn').onclick = () => switchView('/admin/tags');

    const userPerms = (await ajaxGet('/api/user/elements/can_manage_users')).can_manage_users
    const isNew = id === 'new';
    let tag = { name: '', color: '#808080', description: '', min_difficulty: '' };
    let whitelist = [];

    if (!isNew) {
        try {
            const tags = (await ajaxGet('/api/tags')).data || [];
            tag = tags.find(t => t.id == id);
            if (!tag) throw new Error('Tag not found');
            whitelist = (await ajaxGet(`/api/tags/${id}/whitelist`)).data || [];
        } catch (e) {
            adminContent.innerHTML = '<p>Error loading tag.</p>';
            return;
        }
    }

    adminContent.innerHTML = `
        <div class="form-info">
            <article class="form-box">
                <h2>${isNew ? 'Create New Tag' : 'Edit Tag'}</h2>
                <form id="tag-form">
                    <label>Name <input type="text" name="name" value="${tag.name}" required></label>
                    <label>Color <input type="color" name="color" value="${tag.color}" required></label>
                    <label>Min Difficulty <input type="number" name="min_difficulty" value="${tag.min_difficulty ?? ''}" min="1" max="5"></label>
                    <label>Description <textarea name="description">${tag.description || ''}</textarea></label>
                    <div class="tag-detail-actions">
                        <button type="submit" class="primary">${isNew ? 'Create' : 'Save'}</button>
                        ${!isNew ? `<button type="button" id="delete-tag-btn" class="contrast">Delete Tag</button>` : ''}
                    </div>
                </form>
                ${!isNew && userPerms ? `
                    <hr>
                    <h3>Whitelist (Restricted Access)</h3>
                    <form id="whitelist-form" class="whitelist-form">
                        <label class="whitelist-form-label">
                            <input list="users-datalist" id="whitelist-user-input" placeholder="Search by name or email..." autocomplete="off">
                            <datalist id="users-datalist"></datalist>
                            <button type="submit" class="whitelist-form-submit">Add User</button>
                        </label>
                    </form>
                    <table class="admin-table">
                        <thead><tr><th>Name</th><th>Email</th><th>Action</th></tr></thead>
                        <tbody id="whitelist-table-body">${renderWhitelistRows(whitelist, id)}</tbody>
                    </table>
                ` : ''}
            </article>
        </div>`;

    document.getElementById('tag-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.min_difficulty = data.min_difficulty === '' ? null : parseInt(data.min_difficulty);

        try {
            if (isNew) await ajaxPost('/api/tags', data);
            else await ajaxPut(`/api/tags/${id}`, data);
            notify('Success', 'Tag saved', NotificationTypes.SUCCESS);
            switchView(`/admin/tags`);
        } catch (err) {
            notify('Error', 'Save failed', NotificationTypes.ERROR);
        }
    };

    if (!isNew) {
        document.getElementById('delete-tag-btn').onclick = async () => {
            if (!confirm('Delete tag?')) return;
            await ajaxDelete(`/api/tags/${id}`);
            notify('Success', 'Tag deleted', NotificationTypes.SUCCESS);
            switchView('/admin/tags');
        };

        if (userPerms) {
            try {
                const usersData = await ajaxGet('/api/admin/users?limit=1000');
                const users = usersData.users || [];
                const datalist = document.getElementById('users-datalist');
                datalist.innerHTML = users.map(u => `<option value="${u.id} - ${u.first_name} ${u.last_name} (${u.email})">`).join('');
            } catch (e) {}

            document.getElementById('whitelist-form').onsubmit = async (e) => {
                e.preventDefault();
                const userId = parseInt(document.getElementById('whitelist-user-input').value.split(' - ')[0]);
                if (!userId || isNaN(userId)) return notify('Warning', 'Select a valid user', NotificationTypes.WARNING);

                try {
                    await ajaxPost(`/api/tags/${id}/whitelist`, { userId });
                    notify('Success', 'Added to whitelist', NotificationTypes.SUCCESS);
                    const list = (await ajaxGet(`/api/tags/${id}/whitelist`)).data || [];
                    document.getElementById('whitelist-table-body').innerHTML = renderWhitelistRows(list, id);
                    document.getElementById('whitelist-user-input').value = '';
                } catch (err) {
                    notify('Error', 'Add failed', NotificationTypes.ERROR);
                }
            };
        }
        setupRemoveButtons(id);
    }
}

/**
 * Format whitelist table rows.
 * @param {Array} whitelist
 * @param {number} tagId
 * @returns {string}
 */
function renderWhitelistRows(whitelist, tagId) {
    if (!whitelist || whitelist.length === 0) return '<tr><td colspan="3">No restrictions.</td></tr>';
    return whitelist.map(user => `
        <tr>
            <td>${user.first_name} ${user.last_name}</td>
            <td>${user.email}</td>
            <td><button class="remove-whitelist-btn outline contrast" data-user-id="${user.id}">Remove</button></td>
        </tr>
    `).join('');
}

/**
 * Initialize whitelist removal handlers.
 * @param {number} tagId
 */
function setupRemoveButtons(tagId) {
    const tbody = document.getElementById('whitelist-table-body');
    if (!tbody) return;
    tbody.onclick = async (e) => {
        if (e.target.classList.contains('remove-whitelist-btn')) {
            const userId = e.target.dataset.userId;
            try {
                await ajaxDelete(`/api/tags/${tagId}/whitelist/${userId}`);
                notify('Success', 'Removed from whitelist', NotificationTypes.SUCCESS);
                const list = (await ajaxGet(`/api/tags/${tagId}/whitelist`)).data || [];
                tbody.innerHTML = renderWhitelistRows(list, tagId);
            } catch (err) {
                notify('Error', 'Removal failed', NotificationTypes.ERROR);
            }
        }
    }
}
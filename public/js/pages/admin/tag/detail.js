import { ajaxGet, ajaxPost, ajaxPut, ajaxDelete } from '/js/utils/ajax.js';
import { switchView } from '/js/utils/view.js';
import { adminContentID } from '../common.js';
import { notify, NotificationTypes } from '/js/components/notification.js';
import { ARROW_FORWARD_IOS_SVG, CLOSE_SVG } from "../../../../images/icons/outline/icons.js"

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
    if (actionsEl) actionsEl.innerHTML = `<button id="admin-back-btn">${ARROW_FORWARD_IOS_SVG} Back to Tags</button>`;
    document.getElementById('admin-back-btn').onclick = () => switchView('/admin/tags');

    const userData = await ajaxGet('/api/user/elements/permissions').catch(() => ({}));
    const userPerms = (userData.permissions || []).includes('user.manage');
    const isNew = id === 'new';
    let tag = { name: '', color: '#808080', description: '', min_difficulty: '' };
    let whitelist = [];
    let managers = [];

    if (!isNew) {
        try {
            const tags = (await ajaxGet('/api/tags')).data || [];
            tag = tags.find(t => t.id == id);
            if (!tag) throw new Error('Tag not found');
            whitelist = (await ajaxGet(`/api/tags/${id}/whitelist`)).data || [];
            managers = (await ajaxGet(`/api/tags/${id}/managers`)).data || [];
        } catch (e) {
            adminContent.innerHTML = '<p>Error loading tag.</p>';
            return;
        }
    }

    adminContent.innerHTML = /*html*/`
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
                    <h3>Designated Managers</h3>
                    <p class="helper-text">Users allowed to manage (create/edit/read) events with this tag in the admin panel.</p>
                    <form id="managers-form" class="whitelist-form">
                        <label class="whitelist-form-label">
                            <input list="managers-datalist" id="managers-user-input" placeholder="Search by name or email..." autocomplete="off">
                            <datalist id="managers-datalist"></datalist>
                            <button type="submit" class="whitelist-form-submit">Add Manager</button>
                        </label>
                    </form>
                    <table class="admin-table">
                        <thead><tr><th>Name</th><th>Email</th><th>Action</th></tr></thead>
                        <tbody id="managers-table-body">${renderUserRows(managers, id, 'remove-manager-btn')}</tbody>
                    </table>

                    <hr>
                    <h3>Whitelist (Restricted Access)</h3>
                    <p class="helper-text">If used, only these users will be able to see or join events with this tag.</p>
                    <form id="whitelist-form" class="whitelist-form">
                        <label class="whitelist-form-label">
                            <input list="users-datalist" id="whitelist-user-input" placeholder="Search by name or email..." autocomplete="off">
                            <datalist id="users-datalist"></datalist>
                            <button type="submit" class="whitelist-form-submit">Add User</button>
                        </label>
                    </form>
                    <table class="admin-table">
                        <thead><tr><th>Name</th><th>Email</th><th>Action</th></tr></thead>
                        <tbody id="whitelist-table-body">${renderUserRows(whitelist, id, 'remove-whitelist-btn')}</tbody>
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
            // Load Whitelist Users (All)
            ajaxGet('/api/admin/users?limit=1000').then(usersData => {
                const users = usersData.users || [];
                const datalist = document.getElementById('users-datalist');
                if (datalist) datalist.innerHTML = users.map(u => `<option value="${u.id} - ${u.first_name} ${u.last_name} (${u.email})">`).join('');
            }).catch(() => {});

            // Load Managers (Execs Only)
            ajaxGet('/api/admin/users?limit=1000&permissions=perm:is_exec').then(usersData => {
                const users = usersData.users || [];
                const datalist = document.getElementById('managers-datalist');
                if (datalist) datalist.innerHTML = users.map(u => `<option value="${u.id} - ${u.first_name} ${u.last_name} (${u.email})">`).join('');
            }).catch(() => {});

            // Managers Form
            document.getElementById('managers-form').onsubmit = async (e) => {
                e.preventDefault();
                const userId = parseInt(document.getElementById('managers-user-input').value.split(' - ')[0]);
                if (!userId || isNaN(userId)) return notify('Warning', 'Select a valid user', NotificationTypes.WARNING);

                try {
                    await ajaxPost(`/api/tags/${id}/managers`, { userId });
                    notify('Success', 'Manager added', NotificationTypes.SUCCESS);
                    const list = (await ajaxGet(`/api/tags/${id}/managers`)).data || [];
                    document.getElementById('managers-table-body').innerHTML = renderUserRows(list, id, 'remove-manager-btn');
                    document.getElementById('managers-user-input').value = '';
                } catch (err) {
                    notify('Error', 'Add failed', NotificationTypes.ERROR);
                }
            };

            // Whitelist Form
            document.getElementById('whitelist-form').onsubmit = async (e) => {
                e.preventDefault();
                const userId = parseInt(document.getElementById('whitelist-user-input').value.split(' - ')[0]);
                if (!userId || isNaN(userId)) return notify('Warning', 'Select a valid user', NotificationTypes.WARNING);

                try {
                    await ajaxPost(`/api/tags/${id}/whitelist`, { userId });
                    notify('Success', 'Added to whitelist', NotificationTypes.SUCCESS);
                    const list = (await ajaxGet(`/api/tags/${id}/whitelist`)).data || [];
                    document.getElementById('whitelist-table-body').innerHTML = renderUserRows(list, id, 'remove-whitelist-btn');
                    document.getElementById('whitelist-user-input').value = '';
                } catch (err) {
                    notify('Error', 'Add failed', NotificationTypes.ERROR);
                }
            };
        }
        setupActionButtons(id, 'managers-table-body', 'remove-manager-btn', 'managers');
        setupActionButtons(id, 'whitelist-table-body', 'remove-whitelist-btn', 'whitelist');
    }
}

/**
 * Format table rows for users (managers or whitelist).
 * @param {Array} users
 * @param {number} tagId
 * @param {string} btnClass
 * @returns {string}
 */
function renderUserRows(users, tagId, btnClass) {
    if (!users || users.length === 0) return '<tr><td colspan="3">None.</td></tr>';
    return users.map(user => `
        <tr>
            <td data-label="Name">${user.first_name} ${user.last_name}</td>
            <td data-label="Email">${user.email}</td>
            <td data-label="Action"><button class="${btnClass} outline contrast" data-user-id="${user.id}">${CLOSE_SVG}</button></td>
        </tr>
    `).join('');
}

/**
 * Initialize action buttons (remove manager or whitelist).
 * @param {number} tagId
 * @param {string} tableId
 * @param {string} btnClass
 * @param {string} endpoint - 'managers' or 'whitelist'
 */
function setupActionButtons(tagId, tableId, btnClass, endpoint) {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;
    tbody.onclick = async (e) => {
        const btn = e.target.closest(`.${btnClass}`);
        if (btn) {
            const userId = btn.dataset.userId;
            try {
                await ajaxDelete(`/api/tags/${tagId}/${endpoint}/${userId}`);
                notify('Success', 'User removed', NotificationTypes.SUCCESS);
                const list = (await ajaxGet(`/api/tags/${tagId}/${endpoint}`)).data || [];
                tbody.innerHTML = renderUserRows(list, tagId, btnClass);
            } catch (err) {
                notify('Error', 'Removal failed', NotificationTypes.ERROR);
            }
        }
    }
}
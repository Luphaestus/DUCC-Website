import { ajaxGet, ajaxPost, ajaxPut, ajaxDelete } from '../../misc/ajax.js';
import { switchView } from '../../misc/view.js';
import { adminContentID } from '../common.js';
import { notify, NotificationTypes } from '../../misc/notification.js';

/**
 * Tag Detail Editor Module (Admin).
 * Manages individual tags used for event categorization and restriction.
 * Includes:
 * - Basic metadata editing (Name, Color, Description).
 * - Difficulty-based access control setting.
 * - Whitelist management: Restricting events with this tag to specific users only.
 */

/**
 * Renders the tag editor form and whitelist management table.
 * @param {string} id - The tag ID or 'new'.
 */
export async function renderTagDetail(id) {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    // Breadcrumb navigation
    const actionsEl = document.getElementById('admin-header-actions');
    if (actionsEl) {
        actionsEl.innerHTML = '<button id="admin-back-btn">&larr; Back to Tags</button>';
        document.getElementById('admin-back-btn').onclick = () => switchView('/admin/tags');
    }

    // Whitelist management requires user management permissions to search for users
    const userPerms = (await ajaxGet('/api/user/elements/can_manage_users')).can_manage_users

    const isNew = id === 'new';
    let tag = { name: '', color: '#808080', description: '', min_difficulty: '' };
    let whitelist = [];

    if (!isNew) {
        try {
            // Fetch tag details and current whitelist
            const tags = (await ajaxGet('/api/tags')).data || [];

            tag = tags.find(t => t.id == id);
            if (!tag) throw new Error('Tag not found');

            whitelist = (await ajaxGet(`/api/tags/${id}/whitelist`)).data || [];
        } catch (e) {
            console.error(e);
            adminContent.innerHTML = '<p>Error loading tag.</p>';
            return;
        }
    }

    // Render Form
    adminContent.innerHTML = `
        <div class="form-info">
            <article class="form-box">
                <h2>${isNew ? 'Create New Tag' : 'Edit Tag'}</h2>
                <form id="tag-form">
                    <label>Name
                        <input type="text" name="name" value="${tag.name}" required>
                    </label>
                    <label>Color
                        <input type="color" name="color" value="${tag.color}" required>
                    </label>
                    <label>Min Difficulty (Leave empty for none)
                        <input type="number" name="min_difficulty" value="${tag.min_difficulty !== null ? tag.min_difficulty : ''}" min="1" max="5">
                    </label>
                    <label>Description
                        <textarea name="description">${tag.description || ''}</textarea>
                    </label>
                    <div class="tag-detail-actions">
                        <button type="submit" class="primary">${isNew ? 'Create' : 'Save'}</button>
                        ${!isNew ? `<button type="button" id="delete-tag-btn" class="contrast">Delete Tag</button>` : ''}
                    </div>
                </form>
                
                ${!isNew ? `
                    ${userPerms ? `
                        <hr>
                        <h3>Whitelist (Restricted Access)</h3>
                        <p>Only users on this list can view/join events with this tag. (If empty, no whitelist restriction).</p>
                        <form id="whitelist-form" class="whitelist-form">
                        <label class="whitelist-form-label">
                            <input list="users-datalist" id="whitelist-user-input" placeholder="Search by name or email..." autocomplete="off">
                            <datalist id="users-datalist"></datalist>
                            <button type="submit" class="whitelist-form-submit">Add User</button>
                        </label>
                        </form>
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="whitelist-table-body">
                                ${renderWhitelistRows(whitelist, id)}
                            </tbody>
                        </table>
                    ` : ""}
                ` : ''}
            </article>
        </div>
    `;

    // Handle Tag Metadata Update
    document.getElementById('tag-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Canonicalize empty difficulty to null for backend
        if (data.min_difficulty === '') data.min_difficulty = null;
        else data.min_difficulty = parseInt(data.min_difficulty);

        try {
            if (isNew) {
                await ajaxPost('/api/tags', data);
                notify('Success', 'Tag created successfully', NotificationTypes.SUCCESS);
                switchView(`/admin/tags`);
            } else {
                await ajaxPut(`/api/tags/${id}`, data);
                notify('Success', 'Tag updated successfully', NotificationTypes.SUCCESS);
                switchView(`/admin/tags`);
            }
        } catch (err) {
            notify('Error', 'Error saving tag: ' + err.message, NotificationTypes.ERROR);
        }
    };

    if (!isNew) {
        // Handle Tag Deletion
        document.getElementById('delete-tag-btn').onclick = async () => {
            await ajaxDelete(`/api/tags/${id}`);
            notify('Success', 'Tag deleted successfully', NotificationTypes.SUCCESS);
            switchView('/admin/tags');
        };

        // --- Whitelist Management Logic ---
        if (userPerms) {
            try {
                // Populate autocomplete datalist with all users
                // Note: limit=1000 is used as a workaround for pagination in search
                const usersData = await ajaxGet('/api/admin/users?limit=1000');
                const users = usersData.users || [];
                const datalist = document.getElementById('users-datalist');
                datalist.innerHTML = users.map(u => `<option value="${u.id} - ${u.first_name} ${u.last_name} (${u.email})">`).join('');
            } catch (e) { console.error("Failed to load users for autocomplete", e); }

            // Handle adding a user to the whitelist
            document.getElementById('whitelist-form').onsubmit = async (e) => {
                e.preventDefault();
                const inputVal = document.getElementById('whitelist-user-input').value;
                // Extract ID from the "ID - Name (Email)" format
                const userId = parseInt(inputVal.split(' - ')[0]);

                if (!userId || isNaN(userId)) {
                    notify('Warning', 'Please select a valid user from the list.', NotificationTypes.WARNING);
                    return;
                }

                try {
                    await ajaxPost(`/api/tags/${id}/whitelist`, { userId: userId });
                    notify('Success', 'User added to whitelist', NotificationTypes.SUCCESS);

                    // Refresh whitelist table
                    const newWhitelist = (await ajaxGet(`/api/tags/${id}/whitelist`)).data || [];
                    document.getElementById('whitelist-table-body').innerHTML = renderWhitelistRows(newWhitelist, id);
                    document.getElementById('whitelist-user-input').value = '';
                } catch (err) {
                    notify('Error', 'Error adding user: ' + err.message, NotificationTypes.ERROR);
                }
            };
        }

        setupRemoveButtons(id);
    }
}

/**
 * Generates HTML rows for the whitelist table.
 * @param {Array} whitelist - List of users.
 * @param {number} tagId - Parent tag ID.
 * @returns {string} HTML string.
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
 * Sets up delegated event listener for "Remove" buttons in the whitelist table.
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
                notify('Success', 'User removed from whitelist', NotificationTypes.SUCCESS);

                // Refresh list
                const newWhitelist = (await ajaxGet(`/api/tags/${tagId}/whitelist`)).data || [];
                tbody.innerHTML = renderWhitelistRows(newWhitelist, tagId);
            } catch (err) {
                notify('Error', 'Error removing user: ' + err.message, NotificationTypes.ERROR);
            }
        }
    }
}

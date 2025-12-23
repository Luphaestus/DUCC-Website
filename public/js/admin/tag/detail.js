import { ajaxGet, ajaxPost, ajaxPut, ajaxDelete } from '../../misc/ajax.js';
import { switchView } from '../../misc/view.js';
import { adminContentID } from '../common.js';

export async function renderTagDetail(id) {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    const actionsEl = document.getElementById('admin-header-actions');
    if (actionsEl) {
        actionsEl.innerHTML = '<button id="admin-back-btn">&larr; Back to Tags</button>';
        document.getElementById('admin-back-btn').onclick = () => switchView('/admin/tags');
    }

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
            console.error(e);
            adminContent.innerHTML = '<p>Error loading tag.</p>';
            return;
        }
    }

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
                    <div class="grid">
                        <button type="button" class="secondary" onclick="window.history.back()">Cancel</button>
                        <button type="submit" class="primary">${isNew ? 'Create' : 'Save'}</button>
                    </div>
                </form>
                
                ${!isNew ? `
                    <div class="danger-zone">
                        <h3>Danger Zone</h3>
                        <button id="delete-tag-btn" class="contrast">Delete Tag</button>
                    </div>

                    ${userPerms ? `
                        <h3>Whitelist (Restricted Access)</h3>
                        <p>Only users on this list can view/join events with this tag. (If empty, no whitelist restriction).</p>
                        <form id="whitelist-form" style="display: flex; gap: 10px; align-items: flex-end;">
                            <label style="flex-grow: 1;">Add User
                                <input list="users-datalist" id="whitelist-user-input" placeholder="Search by name or email..." autocomplete="off">
                                <datalist id="users-datalist"></datalist>
                            </label>
                            <button type="submit" style="margin-bottom: var(--spacing);">Add</button>
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

    document.getElementById('tag-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        if (data.min_difficulty === '') data.min_difficulty = null;
        else data.min_difficulty = parseInt(data.min_difficulty);

        try {
            if (isNew) {
                await ajaxPost('/api/tags', data);
                switchView(`/admin/tags`);
            } else {
                await ajaxPut(`/api/tags/${id}`, data);
                switchView(`/admin/tags`);
            }
        } catch (err) {
            alert('Error saving tag: ' + err.message);
        }
    };

    if (!isNew) {
        document.getElementById('delete-tag-btn').onclick = async () => {
            if (confirm('Are you sure you want to delete this tag?')) {
                await ajaxDelete(`/api/tags/${id}`);
                switchView('/admin/tags');
            }
        };

        // Populate Datalist
        if (userPerms) {
            try {
                const usersData = await ajaxGet('/api/admin/users?limit=1000');
                const users = usersData.users || [];
                const datalist = document.getElementById('users-datalist');
                datalist.innerHTML = users.map(u => `<option value="${u.id} - ${u.first_name} ${u.last_name} (${u.email})">`).join('');
            } catch (e) { console.error("Failed to load users for autocomplete", e); }

            document.getElementById('whitelist-form').onsubmit = async (e) => {
                e.preventDefault();
                const inputVal = document.getElementById('whitelist-user-input').value;
                const userId = parseInt(inputVal.split(' - ')[0]);

                if (!userId || isNaN(userId)) {
                    alert("Please select a valid user from the list.");
                    return;
                }

                try {
                    await ajaxPost(`/api/tags/${id}/whitelist`, { userId: userId });
                    const newWhitelist = (await ajaxGet(`/api/tags/${id}/whitelist`)).data || [];
                    document.getElementById('whitelist-table-body').innerHTML = renderWhitelistRows(newWhitelist, id);
                    document.getElementById('whitelist-user-input').value = '';
                } catch (err) {
                    alert('Error adding user: ' + err.message);
                }
            };
        }

        setupRemoveButtons(id);
    }
}

function renderWhitelistRows(whitelist, tagId) {
    if (!whitelist || whitelist.length === 0) return '<tr><td colspan="3">No restrictions.</td></tr>';
    console.log(whitelist)
    return whitelist.map(user => `
        <tr>
            <td>${user.first_name} ${user.last_name}</td>
            <td>${user.email}</td>
            <td><button class="remove-whitelist-btn outline contrast" data-user-id="${user.id}">Remove</button></td>
        </tr>
    `).join('');
}

function setupRemoveButtons(tagId) {
    const tbody = document.getElementById('whitelist-table-body');
    if (!tbody) return;

    tbody.onclick = async (e) => {
        if (e.target.classList.contains('remove-whitelist-btn')) {
            const userId = e.target.dataset.userId;
            if (confirm('Remove user from whitelist?')) {
                await ajaxDelete(`/api/tags/${tagId}/whitelist/${userId}`);
                const newWhitelist = (await ajaxGet(`/api/tags/${tagId}/whitelist`)).data || [];
                tbody.innerHTML = renderWhitelistRows(newWhitelist, tagId);
            }
        }
    }
}

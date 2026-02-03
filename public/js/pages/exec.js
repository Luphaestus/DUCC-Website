/**
 * exec.js
 * 
 * Logic for the Executive Committee view.
 * 
 * Registered Route: /exec
 */

import { apiRequest } from '/js/utils/api.js';
import { ViewChangedEvent, addRoute, switchView } from '/js/utils/view.js';
import { notify } from '/js/components/notification.js';
import { showConfirmModal } from '/js/utils/modal.js';
import { Modal } from '/js/widgets/Modal.js';
import { Panel } from '../widgets/panel.js';
import {
    GROUP_SVG, EDIT_SVG, SAVE_SVG, ADD_SVG, CLOSE_SVG, DELETE_SVG, SEARCH_SVG
} from '/images/icons/outline/icons.js';
import { renderAvatar } from '/js/utils/avatar.js';
import { UploadWidget } from '/js/widgets/upload/UploadWidget.js';

addRoute('/exec', 'exec');

const HTML_TEMPLATE = /*html*/`
<div id="exec-view" class="view hidden">
    <div class="container">
        <header class="page-header">
            <div class="header-text">
                <h1>Executive Committee</h1>
                <p>The team running the club for the current academic year.</p>
            </div>
            <div id="exec-admin-actions" class="header-actions"></div>
        </header>

        <section id="current-exec-section">
            <div id="current-exec-grid" class="exec-grid">
                <p aria-busy="true">Loading committee...</p>
            </div>
        </section>

        <section id="past-exec-section" class="past-exec-section hidden">
            <h2>Past Committees</h2>
            <div id="past-exec-container" class="past-exec-container">
                <p>Loading past members...</p>
            </div>
        </section>
    </div>
</div>`;

let currentUserPerms = [];

async function fetchAndRenderExec() {
    const grid = document.getElementById('current-exec-grid');
    const pastContainer = document.getElementById('past-exec-container');
    const adminActions = document.getElementById('exec-admin-actions');
    
    try {
        const [execData, userRes] = await Promise.all([
            apiRequest('GET', '/api/exec'),
            apiRequest('GET', '/api/user/elements/permissions').catch(() => ({ permissions: [] }))
        ]);

        currentUserPerms = userRes.permissions || [];
        const canManage = currentUserPerms.includes('exec.manage');

        if (canManage) {
            adminActions.innerHTML = `
                <div class="button-group">
                    <button id="add-exec-btn" class="primary">${ADD_SVG} Add Member</button>
                </div>
            `;

            document.getElementById('add-exec-btn').onclick = () => openExecModal();
        }

        // Render Current
        if (execData.current.length === 0) {
            grid.innerHTML = '<p class="empty-state">No current executive members listed.</p>';
        } else {
            // Group by rank to ensure different ranks are never on the same row
            const grouped = {};
            execData.current.forEach(m => {
                const rank = m.display_order || 4;
                if (!grouped[rank]) grouped[rank] = [];
                grouped[rank].push(m);
            });

            grid.innerHTML = Object.keys(grouped).sort((a, b) => a - b).map(rank => `
                <div class="exec-rank-row rank-${rank}-row">
                    <div class="exec-grid">
                        ${grouped[rank].map(member => renderExecCard(member, canManage)).join('')}
                    </div>
                </div>
            `).join('');
        }

        // Render Past
        if (execData.past.length > 0) {
            document.getElementById('past-exec-section').classList.remove('hidden');
            // Group by term end year
            const grouped = {};
            execData.past.forEach(m => {
                const year = new Date(m.term_end).getFullYear();
                if (!grouped[year]) grouped[year] = [];
                grouped[year].push(m);
            });

            pastContainer.innerHTML = Object.keys(grouped).sort((a, b) => b - a).map(year => `
                <div class="past-year-group">
                    <h3>Academic Year ${year - 1}/${year}</h3>
                    <div class="past-exec-list">
                        ${grouped[year].map(m => `
                            <div class="past-member-row">
                                <div class="past-member-avatar">
                                    ${renderAvatar(m, { classes: 'small' })}
                                </div>
                                <div class="past-member-info">
                                    <span class="member-role">${m.role_name}</span>
                                    <span class="member-name">${m.first_name} ${m.last_name}</span>
                                </div>
                                ${canManage ? `
                                    <button class="past-edit-btn" onclick="window.editExecMember(${m.id}, '${m.role_name}', ${m.display_order})" title="Edit Record">
                                        ${EDIT_SVG}
                                    </button>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }

        // Bind Edit buttons
        window.editExecMember = (id) => {
            const member = [...execData.current, ...execData.past].find(m => m.id == id);
            openExecModal(member);
        };

        grid.querySelectorAll('[data-edit-exec]').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.editExec;
                const member = execData.current.find(m => m.id == id);
                openExecModal(member);
            };
        });

        grid.querySelectorAll('[data-delete-exec]').forEach(btn => {
            btn.onclick = async () => {
                if (await showConfirmModal("Remove Exec?", "Are you sure you want to remove this record?")) {
                    await apiRequest('DELETE', `/api/exec/${btn.dataset.deleteExec}`);
                    notify('Success', 'Member removed.', 'success');
                    fetchAndRenderExec();
                }
            };
        });

    } catch (err) {
        grid.innerHTML = `<p class="error-text">Failed to load committee: ${err.message}</p>`;
    }
}

function renderExecCard(member, canManage) {
    const rank = member.display_order || 4;
    let avatarSize = 'large';
    if (rank === 1) avatarSize = 'xlarge';
    else if (rank >= 4) avatarSize = 'medium';

    return `
        <article class="exec-card rank-${rank}">
            <div class="exec-image">
                ${rank <= 2 ? '<div class="waves"><div class="wave"></div><div class="wave"></div><div class="wave"></div></div>' : ''}
                ${renderAvatar(member, { classes: avatarSize })}
            </div>
            <div class="exec-info">
                <h3>${member.role_name}</h3>
                <p class="exec-name">${member.first_name} ${member.last_name}</p>
                <p class="exec-email">${member.email}</p>
            </div>
            ${canManage ? `
                <div class="exec-actions">
                    <button class="small-btn icon-only secondary" data-edit-exec="${member.id}">${EDIT_SVG}</button>
                    <button class="small-btn icon-only delete" data-delete-exec="${member.id}">${CLOSE_SVG}</button>
                </div>
            ` : ''}
        </article>
    `;
}

function openExecModal(member = null) {
    const isEdit = !!member;
    const modalId = 'exec-modal';

    // Cleanup existing modal to avoid ID collisions and stale state
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();
    
    const modalContent = /*html*/`
        <form id="exec-form" class="modern-form">
            <div class="form-section">
                <h3>Member Link</h3>
                <div class="search-field mb-4" style="position: relative;">
                    <label>Search Existing Member</label>
                    <div class="glass-input-group">
                        <span class="icon">${SEARCH_SVG}</span>
                        <input type="text" id="exec-user-search" placeholder="Type name or email to link...">
                    </div>
                    <div id="exec-user-results" class="glass-panel hidden mt-2" style="max-height: 200px; overflow-y: auto; position: absolute; width: 100%; z-index: 100;"></div>
                </div>
                <div class="grid">
                    <input type="hidden" id="exec-user-id" value="${member?.user_id || ''}">
                    <label>Role Title 
                        <input type="text" id="exec-role-name" value="${member?.role_name || ''}" placeholder="e.g. Welfare Officer" required>
                    </label>
                    <label>Display Order 
                        <input type="number" id="exec-display-order" value="${member?.display_order || 0}">
                    </label>
                </div>
            </div>

            <div class="form-section">
                <h3>Status & Term</h3>
                <div class="checkbox-group mb-2">
                    <label>
                        <input type="checkbox" id="exec-is-current" ${(!isEdit || member?.is_current) ? 'checked' : ''}>
                        Current Committee Member
                    </label>
                </div>
                <div class="grid">
                    <label>Term Start <input type="date" id="exec-term-start" value="${member?.term_start?.split('T')[0] || ''}"></label>
                    <label>Term End <input type="date" id="exec-term-end" value="${member?.term_end?.split('T')[0] || ''}"></label>
                </div>
            </div>

            <div class="form-section">
                <h3>Overrides (Historical Data)</h3>
                <p class="small-text">Use these for past members or if you want to use different names/photos than their profile.</p>
                <div class="grid">
                    <label>First Name Override <input type="text" id="exec-first-name-override" value="${member?.first_name_override || ''}"></label>
                    <label>Last Name Override <input type="text" id="exec-last-name-override" value="${member?.last_name_override || ''}"></label>
                </div>
                <label>Email Override <input type="email" id="exec-email-override" value="${member?.email_override || ''}"></label>
                
                <div class="mt-4">
                    <label>Profile Picture Override</label>
                    <div id="exec-pp-upload-container"></div>
                    <input type="hidden" id="exec-pp-override" value="${member?.profile_picture_override_id || ''}">
                </div>
            </div>

            <div class="form-actions">
                <button type="submit" class="primary full-width">${isEdit ? 'Update Member' : 'Add to Committee'}</button>
            </div>
        </form>
    `;

    const modal = new Modal({
        id: modalId,
        title: isEdit ? 'Edit Exec Member' : 'Add Exec Member',
        content: modalContent,
        extraClasses: 'large-modal'
    });

    document.body.insertAdjacentHTML('beforeend', modal.getHTML());
    modal.attachListeners();
    modal.show();

    // Initialize UploadWidget
    const ppInput = document.getElementById('exec-pp-override');
    const uploadWidget = new UploadWidget('exec-pp-upload-container', {
        mode: 'inline',
        defaultPreview: member?.profile_picture_path && member?.profile_picture_override_id ? member.profile_picture_path : null,
        onUploadComplete: (id) => {
            ppInput.value = id;
        },
        onRemove: () => {
            ppInput.value = '';
        },
        onImageSelect: ({id}) => {
            ppInput.value = id;
        }
    });

    // User Search Logic
    const searchInput = document.getElementById('exec-user-search');
    const resultsDropdown = document.getElementById('exec-user-results');
    const userIdInput = document.getElementById('exec-user-id');
    const firstNameInput = document.getElementById('exec-first-name-override');
    const lastNameInput = document.getElementById('exec-last-name-override');
    const emailInput = document.getElementById('exec-email-override');

    let searchTimeout;
    searchInput.oninput = () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            const query = searchInput.value.trim();
            if (query.length < 2) { resultsDropdown.classList.add('hidden'); return; }
            
            try {
                const res = await apiRequest('GET', `/api/admin/users?search=${encodeURIComponent(query)}&limit=5`);
                const users = res.data?.users || [];
                
                if (users.length === 0) {
                    resultsDropdown.innerHTML = '<p class="small-text p-3">No members found.</p>';
                } else {
                    resultsDropdown.innerHTML = users.map(u => `
                        <div class="search-result-item" data-user='${JSON.stringify(u).replace(/'/g, "&apos;")}' style="padding: 0.75rem; cursor: pointer; border-bottom: 1px solid rgba(128,128,128,0.1); display: flex; align-items: center; gap: 0.75rem;">
                            ${renderAvatar(u, { classes: 'mini' })}
                            <div>
                                <strong>${u.first_name} ${u.last_name}</strong><br>
                                <small class="muted-text">${u.email}</small>
                            </div>
                        </div>
                    `).join('');

                    resultsDropdown.querySelectorAll('.search-result-item').forEach(item => {
                        item.onclick = () => {
                            const u = JSON.parse(item.dataset.user);
                            userIdInput.value = u.id;
                            // Optionally autofill overrides if they are empty
                            if (!firstNameInput.value) firstNameInput.value = u.first_name;
                            if (!lastNameInput.value) lastNameInput.value = u.last_name;
                            if (!emailInput.value) emailInput.value = u.email;
                            
                            resultsDropdown.classList.add('hidden');
                            searchInput.value = `${u.first_name} ${u.last_name}`;
                        };
                    });
                }
                resultsDropdown.classList.remove('hidden');
            } catch (e) {
                console.error('User search failed:', e);
            }
        }, 300);
    };

    // Close results when clicking outside
    const outsideClickListener = (e) => {
        if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target)) {
            resultsDropdown.classList.add('hidden');
        }
    };
    document.addEventListener('click', outsideClickListener);

    document.getElementById('exec-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            userId: userIdInput.value || null,
            roleName: document.getElementById('exec-role-name').value,
            displayOrder: parseInt(document.getElementById('exec-display-order').value),
            isCurrent: document.getElementById('exec-is-current').checked ? 1 : 0,
            termStart: document.getElementById('exec-term-start').value || null,
            termEnd: document.getElementById('exec-term-end').value || null,
            firstNameOverride: firstNameInput.value || null,
            lastNameOverride: lastNameInput.value || null,
            emailOverride: emailInput.value || null,
            profilePictureOverrideId: ppInput.value || null
        };

        try {
            if (isEdit) {
                await apiRequest('PUT', `/api/exec/${member.id}`, data);
                notify('Success', 'Member updated.', 'success');
            } else {
                await apiRequest('POST', '/api/exec', data);
                notify('Success', 'Member added.', 'success');
            }
            modal.close();
            fetchAndRenderExec();
        } catch (err) {
            notify('Error', err.message, 'error');
        } finally {
            document.removeEventListener('click', outsideClickListener);
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    ViewChangedEvent.subscribe(({ resolvedPath }) => {
        if (resolvedPath === '/exec') fetchAndRenderExec();
    });
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);
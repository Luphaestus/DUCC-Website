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
    GROUP_SVG, EDIT_SVG, SAVE_SVG, ADD_SVG, CLOSE_SVG, DELETE_SVG
} from '/images/icons/outline/icons.js';

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
            <hr>
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
        const isPresident = currentUserPerms.includes('role:President');
        const isVP = currentUserPerms.includes('role:Vice President');
        const canManage = isPresident || isVP;

        if (canManage) {
            adminActions.innerHTML = `
                <div class="button-group">
                    ${isPresident ? `<button id="archive-exec-btn" class="secondary">${SAVE_SVG} Archive Year</button>` : ''}
                    <button id="add-exec-btn" class="primary">${ADD_SVG} Add Member</button>
                </div>
            `;

            document.getElementById('add-exec-btn').onclick = () => openExecModal();
            if (isPresident) {
                document.getElementById('archive-exec-btn').onclick = async () => {
                    const confirmed = await showConfirmModal(
                        "Archive Current Committee?",
                        "This will mark all current members as 'Past' and set their term end date to today. This is usually done at the end of the academic year."
                    );
                    if (confirmed) {
                        await apiRequest('POST', '/api/exec/archive');
                        notify('Success', 'Committee archived.', 'success');
                        fetchAndRenderExec();
                    }
                };
            }
        }

        // Render Current
        if (execData.current.length === 0) {
            grid.innerHTML = '<p class="empty-state">No current executive members listed.</p>';
        } else {
            grid.innerHTML = execData.current.map(member => renderExecCard(member, canManage)).join('');
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
                                <span class="member-role">${m.role_name}</span>
                                <span class="member-name">${m.first_name} ${m.last_name}</span>
                                ${canManage ? `<button class="small-btn icon-only secondary" onclick="window.editExecMember(${m.id}, '${m.role_name}', ${m.display_order})">${EDIT_SVG}</button>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }

        // Bind Edit buttons
        window.editExecMember = (id, role, order) => {
            openExecModal({ id, role_name: role, display_order: order });
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
    const profilePic = member.profile_picture_path || '/images/misc/ducc.png';
    return `
        <article class="exec-card glass-panel">
            <div class="exec-image">
                <img src="${profilePic}" alt="${member.first_name}">
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
    
    const modalContent = /*html*/`
        <form id="exec-form" class="modern-form">
            ${!isEdit ? `
                <label>User ID <input type="number" id="exec-user-id" required placeholder="User's Database ID"></label>
            ` : ''}
            <label>Role Title <input type="text" id="exec-role-name" value="${member?.role_name || ''}" placeholder="e.g. Welfare Officer" required></label>
            <label>Display Order <input type="number" id="exec-display-order" value="${member?.display_order || 0}"></label>
            <div class="form-actions">
                <button type="submit" class="primary full-width">${isEdit ? 'Update Member' : 'Add to Committee'}</button>
            </div>
        </form>
    `;

    const modal = new Modal({
        id: 'exec-modal',
        title: isEdit ? 'Edit Exec Member' : 'Add Exec Member',
        content: modalContent
    });

    document.body.insertAdjacentHTML('beforeend', modal.getHTML());
    modal.attachListeners();
    modal.show();

    document.getElementById('exec-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            roleName: document.getElementById('exec-role-name').value,
            displayOrder: document.getElementById('exec-display-order').value
        };
        if (!isEdit) data.userId = document.getElementById('exec-user-id').value;

        try {
            if (isEdit) {
                await apiRequest('PUT', `/api/exec/${member.id}`, data);
            } else {
                await apiRequest('POST', '/api/exec', data);
            }
            modal.close();
            fetchAndRenderExec();
        } catch (err) {
            notify('Error', err.message, 'error');
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    ViewChangedEvent.subscribe(({ resolvedPath }) => {
        if (resolvedPath === '/exec') fetchAndRenderExec();
    });
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);

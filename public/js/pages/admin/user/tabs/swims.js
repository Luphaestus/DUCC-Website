/**
 * swims.js (Admin User Tab)
 * 
 * Logic for managing a user's swim records.
 */

import { apiRequest } from '/js/utils/api.js';
import { notify } from '/js/components/notification.js';
import { ADD_SVG, REMOVE_SVG, POOL_SVG } from '/images/icons/outline/icons.js';

/**
 * Renders the swim management tab content.
 * 
 * @param {HTMLElement} container - The tab content container.
 * @param {object} user - The user object.
 */
export async function renderSwimsTab(container, user) {
    container.innerHTML = '<p aria-busy="true">Loading swim records...</p>';

    try {
        const userData = await apiRequest('GET', `/api/user/${user.id}/elements/swims,booties`);
        
        container.innerHTML = `
            <div class="swims-management-grid">
                <div class="swim-control-card glass-panel">
                    <div class="card-header">
                        ${POOL_SVG}
                        <h3>Manage Swims</h3>
                    </div>
                    <div class="current-count">
                        <span class="count-label">Current Swims:</span>
                        <span class="count-value" id="admin-swim-count">${userData.swims || 0}</span>
                    </div>
                    <div class="control-actions">
                        <div class="input-group">
                            <input type="number" id="swim-change-amount" value="1" min="1">
                            <div class="button-group">
                                <button id="add-swims-btn" class="primary">${ADD_SVG} Add</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="swim-control-card glass-panel">
                    <div class="card-header">
                        <div class="bootie-icon">🥾</div>
                        <h3>Manage Booties</h3>
                    </div>
                    <div class="current-count">
                        <span class="count-label">Current Booties:</span>
                        <span class="count-value" id="admin-bootie-count">${userData.booties || 0}</span>
                    </div>
                    <div class="control-actions">
                        <div class="input-group">
                            <input type="number" id="bootie-change-amount" value="1" min="1">
                            <div class="button-group">
                                <button id="add-booties-btn" class="secondary">${ADD_SVG} Add</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('add-swims-btn').onclick = async () => {
            const count = document.getElementById('swim-change-amount').value;
            try {
                await apiRequest('POST', `/api/user/${user.id}/swims`, { count });
                notify('Success', 'Swims added.', 'success');
                const newCount = (userData.swims || 0) + parseInt(count);
                document.getElementById('admin-swim-count').textContent = newCount;
                userData.swims = newCount;
            } catch (err) {
                notify('Error', err.message, 'error');
            }
        };

        document.getElementById('add-booties-btn').onclick = async () => {
            const count = document.getElementById('bootie-change-amount').value;
            try {
                await apiRequest('POST', `/api/user/${user.id}/booties`, { count });
                notify('Success', 'Booties added.', 'success');
                const newCount = (userData.booties || 0) + parseInt(count);
                document.getElementById('admin-bootie-count').textContent = newCount;
                userData.booties = newCount;
            } catch (err) {
                notify('Error', err.message, 'error');
            }
        };

    } catch (e) {
        container.innerHTML = '<p class="error-text">Failed to load swim records.</p>';
    }
}

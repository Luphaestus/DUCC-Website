/**
 * swims.js (Admin User Tab)
 * 
 * Logic for managing a user's swim records.
 */

import { apiRequest } from '@/utils/api';
import { notify } from '@/components/notification';
import { ADD_SVG, REMOVE_SVG, POOL_SVG } from '@/utils/icons';

/**
 * Renders the swim management tab content.
 * 
 * @param {HTMLElement} container - The tab content container.
 * @param {any} user - The user object.
 */
export async function renderSwimsTab(container: HTMLElement, user: any): Promise<void> {
    container.innerHTML = '<p aria-busy="true">Loading swim records...</p>';

    try {
        const userData: any = await apiRequest('GET', `/api/user/${user.id}/elements/swims,booties`);
        
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

        const addSwimsBtn = document.getElementById('add-swims-btn');
        if (addSwimsBtn) {
            addSwimsBtn.onclick = async () => {
                const countInput = document.getElementById('swim-change-amount') as HTMLInputElement | null;
                const count = countInput?.value || '0';
                try {
                    await apiRequest('POST', `/api/user/${user.id}/swims`, { count });
                    notify('Success', 'Swims added.', 'success');
                    const newCount = (userData.swims || 0) + parseInt(count);
                    const countEl = document.getElementById('admin-swim-count');
                    if (countEl) countEl.textContent = String(newCount);
                    userData.swims = newCount;
                } catch (err: any) {
                    notify('Error', err.message, 'error');
                }
            };
        }

        const addBootiesBtn = document.getElementById('add-booties-btn');
        if (addBootiesBtn) {
            addBootiesBtn.onclick = async () => {
                const countInput = document.getElementById('bootie-change-amount') as HTMLInputElement | null;
                const count = countInput?.value || '0';
                try {
                    await apiRequest('POST', `/api/user/${user.id}/booties`, { count });
                    notify('Success', 'Booties added.', 'success');
                    const newCount = (userData.booties || 0) + parseInt(count);
                    const countEl = document.getElementById('admin-bootie-count');
                    if (countEl) countEl.textContent = String(newCount);
                    userData.booties = newCount;
                } catch (err: any) {
                    notify('Error', err.message, 'error');
                }
            };
        }

    } catch (e) {
        container.innerHTML = '<p class="error-text">Failed to load swim records.</p>';
    }
}

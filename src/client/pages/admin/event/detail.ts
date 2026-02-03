/**
 * detail.js (Admin Event Dashboard)
 * 
 * Main logic for the specific event management dashboard.
 * 
 * Registered Route: /admin/event/:id
 */

import { apiRequest } from '@/utils/api';
import { switchView } from '@/utils/view';
import { adminContentID } from '../admin.js';
import { ARROW_BACK_IOS_NEW_SVG, DELETE_HISTORY_SVG, CLOSE_SVG } from '@/utils/icons';
import { TabNav } from '@/widgets/TabNav';
import { Panel } from '@/widgets/panel';
import { showConfirmModal } from '@/utils/modal';
import { notify } from '@/components/notification';

// Import tab renderers
import { renderDetailsTab } from './tabs/details.js';
import { renderFinanceTab } from './tabs/finance.js';

/**
 * Main rendering function for the event management dashboard.
 * 
 * @param {string} id - Database ID of the event, or 'new'.
 */
export async function renderEventDetail(id: string): Promise<void> {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;
    const isNew = id === 'new';

    if (isNew) {
        // Simple creation view - no tabs needed yet
        adminContent.innerHTML = `<div class="glass-layout"><div id="admin-tab-content"></div></div>`;
        const container = document.getElementById('admin-tab-content');
        if (container) {
            const allTagsRes = await apiRequest('GET', '/api/tags');
            const allTags = allTagsRes.data || [];
            const globalDefaultRes = await apiRequest('GET', '/api/globals/DefaultEventImage');
            const globalDefaultUrl = globalDefaultRes.res?.DefaultEventImage?.data || '/images/misc/ducc.png';
            
            await renderDetailsTab(container, { title: '', start: '', end: '', tags: [] }, allTags, true, globalDefaultUrl);
        }
        return;
    }

    // Existing event - Setup Dashboard with Tabs
    adminContent.innerHTML = '<p aria-busy="true">Loading event dashboard...</p>';

    try {
        const [event, rawEvent, allTagsRes, attendeesRes, globalDefaultRes, userPermsRes] = await Promise.all([
            apiRequest('GET', `/api/admin/event/${id}`),
            apiRequest('GET', `/api/admin/event/${id}/raw`),
            apiRequest('GET', '/api/tags'),
            apiRequest('GET', `/api/event/${id}/attendees`),
            apiRequest('GET', '/api/globals/DefaultEventImage'),
            apiRequest('GET', '/api/user/elements/permissions')
        ]);

        const attendees = attendeesRes.attendees || [];
        const userPerms = userPermsRes.permissions || [];
        const globalDefaultUrl = globalDefaultRes.res?.DefaultEventImage?.data || '/images/misc/ducc.png';

        // Set up toolbar back button
        const actionsEl = document.getElementById('admin-header-actions');
        if (actionsEl) {
            actionsEl.innerHTML = `
                <div class="button-group">
                    <button id="admin-delete-event-btn" class="small-btn outline delete">${DELETE_HISTORY_SVG} Delete</button>
                    <button id="admin-cancel-event-btn" class="small-btn outline warning">${CLOSE_SVG} Cancel</button>
                    <button id="admin-back-btn" class="small-btn outline secondary icon-text-btn">${ARROW_BACK_IOS_NEW_SVG} Back to Events</button>
                </div>
            `;
            const backBtn = document.getElementById('admin-back-btn');
            if (backBtn) backBtn.onclick = () => switchView('/admin/events');
            
            const deleteBtn = document.getElementById('admin-delete-event-btn');
            if (deleteBtn) {
                deleteBtn.onclick = async () => {
                    if (!await showConfirmModal('Delete Event', 'Delete event permanently? This cannot be undone.')) return;
                    try {
                        await apiRequest('DELETE', `/api/admin/event/${id}`);
                        notify('Success', 'Event deleted', 'success');
                        switchView('/admin/events');
                    } catch (err: any) { notify('Error', err.message, 'error'); }
                };
            }

            const cancelBtn = document.getElementById('admin-cancel-event-btn');
            if (cancelBtn) {
                cancelBtn.onclick = async () => {
                    if (!await showConfirmModal('Cancel Event', 'Cancel this event? Attendees will be notified and refunded.')) return;
                    try {
                        await apiRequest('POST', `/api/admin/event/${id}/cancel`);
                        notify('Success', 'Event canceled', 'success');
                        switchView('/admin/events');
                    } catch (e: any) { notify('Error', e.message, 'error'); }
                };
            }
        }

        const tabs = [
            { label: 'Edit', key: 'details' },
            { label: 'Finance', key: 'finance' }
        ];

        const currentTab = new URLSearchParams(window.location.search).get('tab') || 'details';

        const tabNav = new TabNav({
            id: 'admin-event-tabs',
            tabs,
            activeKey: currentTab
        });

        adminContent.innerHTML = `
            <div class="glass-layout">
                ${Panel({
                    content: `
                        <header class="event-dashboard-header" style="display:flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
                            <div class="event-identity">
                                <h2 class="nomargin">${event.title}</h2>
                                <span class="badge ${event.costs_released ? 'success' : 'neutral'}">${event.costs_released ? 'Costs Released' : 'Finance Open'}</span>
                            </div>
                            ${tabNav.getHTML()}
                        </header>
                        <div id="admin-tab-content" class="tab-content-area mt-4"></div>
                    `
                })}
            </div>
        `;

        tabNav.init();

        const renderCurrentTab = (tabName: string) => {
            const container = document.getElementById('admin-tab-content');
            if (!container) return;
            if (tabName === 'details') renderDetailsTab(container, { ...event, image_id: rawEvent.image_id }, allTagsRes.data, false, globalDefaultUrl);
            // else if (tabName === 'transport') renderTransportTab(container, id);
            else if (tabName === 'finance') renderFinanceTab(container, event, attendees, userPerms);
            // else if (tabName === 'attendees') renderAttendeesTab(container, id);
        };

        const tabButtons = document.querySelectorAll('#admin-event-tabs button');
        tabButtons.forEach(btn => {
            (btn as HTMLElement).onclick = () => {
                const tab = (btn as HTMLElement).dataset.key;
                if (!tab) return;
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set('tab', tab);
                window.history.replaceState({}, '', newUrl.toString());
                
                tabButtons.forEach(b => b.classList.remove('active'));
                (btn as HTMLElement).classList.add('active');
                tabNav.init(); // Refresh sliding background
                renderCurrentTab(tab);
            };
        });

        renderCurrentTab(currentTab);

    } catch (e) {
        console.error(e);
        adminContent.innerHTML = '<p class="error-text">Failed to load event dashboard.</p>';
    }
}

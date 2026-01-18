import { ViewChangedEvent, addRoute } from '/js/utils/view.js';
import { ajaxGet } from '/js/utils/ajax.js';
import { SHIELD_SVG } from '../../images/icons/outline/icons.js';

/**
 * Unauthorized / Access Denied view.
 * @module Unauthorized
 */

addRoute('/unauthorized', 'unauthorized');

const HTML_TEMPLATE = /*html*/`
<div id="unauthorized-view" class="view hidden">
    <div class="container" style="text-align: center; padding-top: 4rem;">
        <div class="error-icon" style="color: var(--pico-secondary); margin-bottom: 1.5rem;">
            ${SHIELD_SVG.replace('height="24px"', 'height="64px"').replace('width="24px"', 'width="64px"')}
        </div>
        <h1>Access Denied</h1>
        <p>You do not have permission to view this page.</p>
        <div id="unauthorized-actions" class="error-actions" style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;">
            <!-- Buttons injected here -->
        </div>
    </div>
</div>`;

async function updateUnauthorizedButtons() {
    const actionsContainer = document.getElementById('unauthorized-actions');
    if (!actionsContainer) return;

    try {
        const authStatus = await ajaxGet('/api/auth/status');
        if (authStatus.authenticated) {
            actionsContainer.innerHTML = `
                <button data-nav="/home">Go to Home</button>
                <button class="secondary" data-nav="/events">View Events</button>
            `;
        } else {
            actionsContainer.innerHTML = `
                <button data-nav="/login">Login</button>
                <button class="secondary" data-nav="/home">Go to Home</button>
            `;
        }
    } catch (e) {
        actionsContainer.innerHTML = `
            <button data-nav="/home">Go to Home</button>
        `;
    }
}

ViewChangedEvent.subscribe(({ viewId }) => {
    if (viewId === 'unauthorized') {
        updateUnauthorizedButtons();
    }
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);

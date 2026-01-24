/**
 * no_internet.js
 * 
 * Logic for the connection-loss overlay view.
 * 
 * Registered Route: /no-internet
 */

//todo Somehow make it so the user can still use the app in offline mode

import { addRoute } from '/js/utils/view.js';
import { SIGNAL_DISCONNECTED_SVG } from '../../images/icons/outline/icons.js';

addRoute('/no-internet', 'no-connection', { isOverlay: true });

/** HTML Template for the connectivity error view */
const HTML_TEMPLATE = /*html*/`
        <div id="no-connection-view" class="view hidden">
            <div class="container">
                ${SIGNAL_DISCONNECTED_SVG}
                <h1>No Internet Connection</h1>
                <p>Please check your network settings.</p>
                <p>We'll try to reconnect automatically...</p>
            </div>
        </div>`;

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);
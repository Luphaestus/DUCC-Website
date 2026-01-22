/**
 * no_internet.js
 * 
 * Logic for the connection-loss overlay view.
 * Displays a full-screen alert when the client cannot reach the backend server.
 * Managed by connection.js.
 */

import { SIGNAL_DISCONNECTED_SVG } from '../../images/icons/outline/icons.js';

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
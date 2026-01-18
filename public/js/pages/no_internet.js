import { SIGNAL_DISCONNECTED_SVG } from '../../images/icons/outline/icons.js';

/**
 * No Internet / Connection Lost view.
 * @module NoInternet
 */

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

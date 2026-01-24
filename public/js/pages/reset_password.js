/**
 * reset_password.js
 * 
 * Logic for the password reset request view.
 * 
 * Registered Route: /reset-password
 */

import { apiRequest } from '/js/utils/api.js';
import { addRoute, ViewChangedEvent, switchView } from '/js/utils/view.js';
import { MAIL_SVG } from '../../images/icons/outline/icons.js';
import { notify } from '../components/notification.js';

addRoute('/reset-password', 'reset-password');

const HTML_TEMPLATE = /*html*/`
<div id="reset-password-view" class="view hidden">
    <div class="small-container">
        <h1>Reset Password</h1>
        <div class="form-info">
            <article class="form-box">
                <h3>
                    ${MAIL_SVG}
                    Request Password Reset
                </h3>
                <form id="reset-password-form">
                    <div>
                        <label for="reset-email">Email:</label>
                        <div class="durham-email-wrapper">
                            <input class="nobottommargin" id="reset-email" name="email" placeholder="username">
                            <span class="email-suffix">@durham.ac.uk</span>
                        </div>
                    </div>
                    <div id="reset-password-footer">
                        <button type="submit">Send Reset Link</button>
                    </div>
                </form>
                <p class="nobottommargin">Remembered it? <a data-nav="/login" class="cursor-pointer">Login</a></p>
            </article>
        </div>
    </div>
</div>`;

/**
 * Handle view switch to reset-password; redirects if already authenticated.
 * 
 * @param {object} params
 */
function ViewNavigationEventListener({ resolvedPath }) {
    if (resolvedPath === '/reset-password') {
        apiRequest('GET', '/api/auth/status').then((data => {
            if (data.authenticated) {
                switchView('/events');
            }
        }));

        const emailInput = document.getElementById('reset-email');
        if (emailInput) emailInput.value = '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);

    const form = document.getElementById('reset-password-form');
    const emailInput = document.getElementById('reset-email');

    emailInput.addEventListener('input', () => {
        emailInput.removeAttribute('aria-invalid');
        if (emailInput.value.includes('@')) {
            emailInput.value = emailInput.value.split('@')[0];
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        let emailVal = document.getElementById('reset-email').value;
        if (emailVal && !emailVal.includes('@')) {
            emailVal += '@durham.ac.uk';
        }

        try {
            const res = await apiRequest('POST', '/api/auth/reset-password-request', { email: emailVal });
            notify('Success', res.message || 'Reset link sent! Please check your email.', 'success', 5000);
        } catch (error) {
            notify('Error', error.message || error || 'Failed to send reset link.', 'error', 2000);
            emailInput.ariaInvalid = 'true'
        }
    });

    ViewChangedEvent.subscribe(ViewNavigationEventListener);
});
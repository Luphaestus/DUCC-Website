/**
 * set_password.js
 * 
 * Logic for the password completion view.
 * 
 * Registered Route: /set-password
 */

import { apiRequest } from '/js/utils/api.js';
import { addRoute, switchView, ViewChangedEvent } from '/js/utils/view.js';
import { BOLT_SVG } from '../../images/icons/outline/icons.js';
import { notify } from '../components/notification.js';

addRoute('/set-password', 'set-password');

const HTML_TEMPLATE = /*html*/`
<div id="set-password-view" class="view hidden">
    <div class="small-container">
        <h1>Set New Password</h1>
        <div class="form-info">
            <article class="form-box">
                <h3>
                    ${BOLT_SVG}
                    Enter New Password
                </h3>
                <form id="set-password-form">
                    <input type="hidden" id="set-password-token">
                    <div>
                        <label for="new-password">New Password:</label>
                        <input class="nobottommargin" type="password" id="new-password" name="newPassword">
                    </div>
                    <div>
                        <label for="confirm-password">Confirm Password:</label>
                        <input class="nobottommargin" type="password" id="confirm-password" name="confirmPassword">
                    </div>
                    <div id="set-password-footer">
                        <button class="nobottommargin" id="set-password-submit" type="submit">Update Password</button>
                    </div>
                </form>
            </article>
        </div>
    </div>
</div>`;

/**
 * Handle view switch to set-password; extracts token from URL and validates state.
 * 
 * @param {object} params
 */
function ViewNavigationEventListener({ resolvedPath }) {
    if (resolvedPath === '/set-password') {
        apiRequest('GET', '/api/auth/status').then((data => {
            if (data.authenticated) {
                switchView('/events');
            }
        }));

        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const tokenInput = document.getElementById('set-password-token');
        const form = document.getElementById('set-password-form');

        if (token) {
            if (tokenInput) tokenInput.value = token;
            if (form) form.querySelector('button').disabled = false;

        } else {
            if (form) form.querySelector('button').disabled = true;
            notify('Error', 'Invalid or missing token.', 'error', 3000);
            setTimeout(() => switchView('/reset-password'), 3000);
            return;
        }

        const newPassInput = document.getElementById('new-password');
        const confirmPassInput = document.getElementById('confirm-password');
        if (newPassInput) newPassInput.value = '';
        if (confirmPassInput) confirmPassInput.value = '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);

    const form = document.getElementById('set-password-form');
    const tokenInput = document.getElementById('set-password-token');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const token = tokenInput.value;
        const newPassowordInput = document.getElementById('new-password');
        const newPassword = newPassowordInput.value;
        const confirmPasswordInput = document.getElementById('confirm-password');
        const confirmPassword = confirmPasswordInput.value;
        const submitButton = document.getElementById('set-password-submit');

        const inputs = [newPassowordInput, confirmPasswordInput];
        let invalid = false;
        inputs.forEach(input => {
            input.removeAttribute('aria-invalid')
            if (!input.value || input.value.trim() === '') {
                input.setAttribute('aria-invalid', 'true');
                invalid = true;
            }
        });
        if (invalid) {
            notify('Error', 'Please fill in all fields.', 'error', 2000, 'set-password-status');
            return;
        }

        if (newPassword !== confirmPassword) {
            notify('Error', 'Passwords do not match.', 'error', 2000, 'set-password-status');
            confirmPasswordInput.setAttribute('aria-invalid', 'true');
            return;
        }

        confirmPasswordInput.removeAttribute('aria-invalid');

        try {
            const res = await apiRequest('POST', '/api/auth/reset-password', { token, newPassword });
            notify(res.message || 'Success', 'Password updated successfully. Redirecting to login...', 'success', 1500, 'set-password-status');
            setTimeout(() => switchView('/login'), 1000);
        } catch (error) {
            notify('Error', error.message || error || 'Failed to set new password.', 'error', 2000, 'set-password-status');
            if (error.message && error.message.toLowerCase().includes('token')) {
                submitButton.disabled = true;
                setTimeout(() => switchView('/reset-password'), 2000);
            }
        }
    });

    ViewChangedEvent.subscribe(ViewNavigationEventListener);
});
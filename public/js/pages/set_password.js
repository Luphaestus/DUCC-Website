import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { addRoute, switchView, ViewChangedEvent } from '/js/utils/view.js';
import { BOLT_SVG } from '../../images/icons/outline/icons.js';

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
                        <input class="nobottommargin" type="password" id="new-password" name="newPassword" required>
                    </div>
                    <div>
                        <label for="confirm-password">Confirm Password:</label>
                        <input class="nobottommargin" type="password" id="confirm-password" name="confirmPassword" required>
                    </div>
                    <div id="set-password-footer">
                        <button class="nobottommargin" type="submit">Update Password</button>
                    </div>
                </form>
                <div id="set-password-message" class="mt-1"></div>
            </article>
        </div>
    </div>
</div>`;

function ViewNavigationEventListener({ resolvedPath }) {
    if (resolvedPath === '/set-password') {
        ajaxGet('/api/auth/status').then((data => {
            if (data.authenticated) {
                switchView('/events');
            }
        }));

        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const tokenInput = document.getElementById('set-password-token');
        const messageEl = document.getElementById('set-password-message');
        const form = document.getElementById('set-password-form');

        if (token) {
            if (tokenInput) tokenInput.value = token;
            if (messageEl) {
                messageEl.textContent = '';
                messageEl.classList.remove('error', 'success');
            }
            if (form) form.querySelector('button').disabled = false;
        } else {
            if (messageEl) {
                messageEl.textContent = 'Missing reset token.';
                messageEl.classList.add('error');
            }
            if (form) form.querySelector('button').disabled = true;
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
    const messageEl = document.getElementById('set-password-message');
    const tokenInput = document.getElementById('set-password-token');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const token = tokenInput.value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            messageEl.textContent = 'Passwords do not match.';
            messageEl.classList.add('error');
            return;
        }

        messageEl.textContent = 'Updating...';
        messageEl.classList.remove('error', 'success');

        try {
            const res = await ajaxPost('/api/auth/reset-password', { token, newPassword });
            messageEl.textContent = res.message;
            messageEl.classList.add('success');
            setTimeout(() => switchView('/login'), 2000);
        } catch (error) {
            messageEl.textContent = error.message || 'Failed to update password.';
            messageEl.classList.add('error');
        }
    });

    ViewChangedEvent.subscribe(ViewNavigationEventListener);
});

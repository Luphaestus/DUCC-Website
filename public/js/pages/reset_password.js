import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { addRoute, ViewChangedEvent, switchView } from '/js/utils/view.js';
import { MAIL_SVG } from '../../images/icons/outline/icons.js';

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
                        <input class="nobottommargin" id="reset-email" name="email" required>
                    </div>
                    <div id="reset-password-footer">
                        <button class="nobottommargin" type="submit">Send Reset Link</button>
                    </div>
                </form>
                <div id="reset-message" style="margin-top: 1rem;"></div>
                <p class="nobottommargin">Remembered it? <a data-nav="/login" style="cursor: pointer;">Login</a></p>
            </article>
        </div>
    </div>
</div>`;

function ViewNavigationEventListener({ resolvedPath }) {
    if (resolvedPath === '/reset-password') {
        ajaxGet('/api/auth/status').then((data => {
            if (data.authenticated) {
                switchView('/events');
            }
        }));
        
        const emailInput = document.getElementById('reset-email');
        const messageEl = document.getElementById('reset-message');
        if (emailInput) emailInput.value = '';
        if (messageEl) messageEl.textContent = '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);

    const form = document.getElementById('reset-password-form');
    const messageEl = document.getElementById('reset-message');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageEl.textContent = 'Sending...';
        messageEl.style.color = 'var(--text-color)';

        const email = document.getElementById('reset-email').value;

        try {
            const res = await ajaxPost('/api/auth/reset-password-request', { email });
            messageEl.textContent = res.message || 'If an account exists, a reset link has been sent.';
            messageEl.style.color = '#77DD77'; // Pastel green
        } catch (error) {
            messageEl.textContent = error.message || 'Failed to send request.';
            messageEl.style.color = '#FF6961';
        }
    });

    ViewChangedEvent.subscribe(ViewNavigationEventListener);
});

/**
 * login.js
 * 
 * Logic for the user login view.
 * 
 * Registered Route: /login
 */

import { apiRequest } from '/js/utils/api.js';
import { switchView, ViewChangedEvent, addRoute } from '/js/utils/view.js';
import { LoginEvent } from "/js/utils/events/events.js";
import { getPreviousPath } from '/js/utils/history.js';
import { LOGIN_SVG, KEY_SVG, PHONE_SVG } from '/images/icons/outline/icons.js';
import { notify } from '../components/notification.js';

addRoute('/login', 'login');

const HTML_TEMPLATE = /*html*/
    `<div id="login-view" class="view hidden">
            <div class="small-container">
                <h1>Login</h1>
                <div class="form-info">
                    <article class="form-box" id="login-card-content">
                        <h3>
                            ${LOGIN_SVG}
                            Login to your account
                        </h3>
                        <form id="login-form">
                            <div>
                                <div>
                                    <label for="email">Email:</label>
                                    <div class="durham-email-wrapper">
                                        <input id="email" name="email" placeholder="username" autocomplete="username">
                                        <span class="email-suffix">@durham.ac.uk</span>
                                    </div>
                                </div>
                                <div>
                                    <label for="password">Password:</label>
                                    <input type="password" id="password" name="password" autocomplete="current-password">
                                </div>
                            </div>
                            <div id="login-footer" class="button-group vertical">
                                <button type="submit">Login</button>
                                <button type="button" id="passkey-login-initial-btn" class="secondary">${KEY_SVG} Login with Passkey</button>
                            </div>
                        </form>
                        <p><a data-nav="/reset-password">Forgot Password?</a></p>
                        <p>Don't have an account? <a data-nav="/signup">Sign Up</a></p>
                    </article>
                </div>
            </div>
        </div>`;

let email = null;
let password = null;

function handleLoginSuccess(res) {
    LoginEvent.notify({ authenticated: true });
    notify('Success', res.message || 'Login successful!', 'success', 1500, 'login-status');

    const redirect = sessionStorage.getItem('redirect_after_login');
    sessionStorage.removeItem('redirect_after_login');

    if (redirect) {
        switchView(redirect);
    } else {
        const prev = getPreviousPath();
        const badPaths = ['/login', '/signup', '/home'];
        if (!prev || badPaths.includes(prev)) switchView('/events');
        else switchView(prev);
    }
}

async function startPasskeyLogin(emailVal = null) {
    try {
        const options = await apiRequest('POST', '/api/auth/passkey/login-options', { email: emailVal });
        const asseResp = await SimpleWebAuthnBrowser.startAuthentication(options);
        const res = await apiRequest('POST', '/api/auth/passkey/login-verify', asseResp);
        handleLoginSuccess(res);
    } catch (err) {
        notify('Error', err.message || 'Passkey login failed.', 'error');
    }
}

async function render2FAForm(methods) {
    const card = document.getElementById('login-card-content');
    card.innerHTML = /*html*/`
        <h3>Two-Factor Authentication</h3>
        <p>Your account is protected with 2FA. Please verify your identity.</p>
        
        ${methods.totp ? `
            <form id="totp-login-form" class="modern-form">
                <label>Authenticator Code <input type="text" id="totp-code" placeholder="123456" required autofocus></label>
                <button type="submit" class="primary full-width">Verify Code</button>
            </form>
        ` : ''}

        ${methods.passkey ? `
            <div class="passkey-login-section">
                ${methods.totp ? '<div class="divider"><span>OR</span></div>' : ''}
                <button id="passkey-login-btn" class="secondary full-width">${KEY_SVG} Use Passkey</button>
            </div>
        ` : ''}

        <p><button class="small-btn outline secondary" onclick="location.reload()">Back to Login</button></p>
    `;

    if (methods.totp) {
        document.getElementById('totp-login-form').onsubmit = async (e) => {
            e.preventDefault();
            const token = document.getElementById('totp-code').value;
            try {
                const res = await apiRequest('POST', '/api/auth/verify-totp', { token });
                handleLoginSuccess(res);
            } catch (err) {
                notify('Error', err.message, 'error');
            }
        };
    }

    if (methods.passkey) {
        document.getElementById('passkey-login-btn').onclick = () => startPasskeyLogin();
        // Auto-trigger passkey if it's the only method
        if (!methods.totp) startPasskeyLogin();
    }
}

/**
 * Handle view switch to login; redirects to dashboard if already authenticated.
 * 
 * @param {object} params
 */
function ViewNavigationEventListener({ resolvedPath }) {
    if (resolvedPath === '/login') {
        apiRequest('GET', '/api/auth/status', true).then((data => {
            if (data.authenticated) {
                const prev = getPreviousPath();
                const badPaths = ['/login', '/signup', '/home'];
                if (!prev || badPaths.includes(prev)) switchView('/events');
                else switchView(prev);
            }
        }));
    }
    if (email) email.value = '';
    if (password) password.value = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    email = document.getElementById('email');
    password = document.getElementById('password');
    const passkeyBtn = document.getElementById('passkey-login-initial-btn');

    email.addEventListener('input', () => {
        if (email.value.includes('@')) {
            email.value = email.value.split('@')[0];
        }
    });

    if (passkeyBtn) {
        passkeyBtn.onclick = () => {
            let emailVal = email.value;
            if (!emailVal || emailVal.trim() === '') {
                email.setAttribute('aria-invalid', 'true');
                notify('Error', 'Please enter your email prefix to login with passkey.', 'error', 2000, 'login-status');
                return;
            }
            if (!emailVal.includes('@')) {
                emailVal += '@durham.ac.uk';
            }
            startPasskeyLogin(emailVal);
        };
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(loginForm);
        let emailVal = formData.get('email');

        let notPresent = false;
        [email, password].forEach(input => {
            input.removeAttribute('aria-invalid');
            if (!input.value || input.value.trim() === '') {
                input.setAttribute('aria-invalid', 'true');
                notPresent = true;
            }
        });
        if (notPresent) {
            notify('Error', 'Please fill in all fields.', 'error', 2000, 'login-status');
            return;
        }

        if (emailVal && !emailVal.includes('@')) {
            emailVal += '@durham.ac.uk';
        }

        try {
            const res = await apiRequest('POST', '/api/auth/login', { email: emailVal, password: formData.get('password') });
            if (res.requires2FA) {
                render2FAForm(res.methods);
            } else {
                handleLoginSuccess(res);
            }
        } catch (error) {
            notify('Error', error.message || error || 'Login failed.', 'error', 3000, 'login-status');
            if (error.message && error.message.includes('email')) {
                email.setAttribute('aria-invalid', 'true');
            }
            if (error.message && error.message.includes('password')) {
                password.setAttribute('aria-invalid', 'true');
            }
        }
    });

    ViewChangedEvent.subscribe(ViewNavigationEventListener);
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);

export { LoginEvent };
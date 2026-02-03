/**
 * login.js
 * 
 * Logic for the user login view.
 * 
 * Registered Route: /login
 */

import { apiRequest } from '@/utils/api';
import { switchView, ViewChangedEvent, addRoute } from '@/utils/view';
import { LoginEvent } from "/js/utils/events/events.js";
import { getPreviousPath } from '@/utils/history';
import { LOGIN_SVG, KEY_SVG } from '@/utils/icons';
import { notify } from '../components/notification.js';

declare const SimpleWebAuthnBrowser: any;

addRoute('/login', 'login');

const HTML_TEMPLATE = /*html*/
    `<div id="login-view" class="view hidden">
            <div class="small-container">
                <div class="form-info">
                    <article class="form-box shadow" id="login-card-content">
                        <div class="center-text" style="margin-bottom: 2rem;">
                            <h2 class="no-margin">
                                ${LOGIN_SVG}
                                Sign In
                            </h2>
                        </div>
                        
                        <div class="passkey-quick-login center-text" style="margin-bottom: 1.5rem;">
                            <button type="button" id="passkey-login-initial-btn" class="secondary outline full-width">
                                ${KEY_SVG} Sign in with Passkey
                            </button>
                            <div class="divider" style="margin: 1.5rem 0;"><span>OR</span></div>
                        </div>

                        <form id="login-form">
                            <label for="email">Email address</label>
                            <div class="durham-email-wrapper">
                                <input id="email" name="email" placeholder="username" autocomplete="username">
                                <span class="email-suffix">@durham.ac.uk</span>
                            </div>

                            <label for="password">Password</label>
                            <input type="password" id="password" name="password" autocomplete="current-password" placeholder="••••••••">
                            
                            <div style="margin-top: 1rem;">
                                <button type="submit" class="primary full-width">Continue with Password</button>
                            </div>
                        </form>

                        <div class="center-text" style="margin-top: 2rem; border-top: 1px solid var(--pico-muted-border-color); padding-top: 1rem;">
                            <p class="no-margin"><a data-nav="/reset-password" class="secondary">Forgot password?</a></p>
                            <p class="no-margin" style="margin-top: 0.5rem;">New here? <a data-nav="/signup">Create an account</a></p>
                        </div>
                    </article>
                </div>
            </div>
        </div>`;

let emailInput: HTMLInputElement | null = null;
let passwordInput: HTMLInputElement | null = null;

function handleLoginSuccess(res: any) {
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

async function startPasskeyLogin(emailVal: string | null = null) {
    try {
        const options = await apiRequest('POST', '/api/auth/passkey/login-options', { email: emailVal });
        const asseResp = await SimpleWebAuthnBrowser.startAuthentication(options);
        const res = await apiRequest('POST', '/api/auth/passkey/login-verify', asseResp);
        handleLoginSuccess(res);
    } catch (err: any) {
        // If the user cancelled, don't show an error notification
        if (err.name === 'NotAllowedError' || err.name === 'AbortError') return;
        notify('Error', err.message || 'Passkey login failed.', 'error');
    }
}

async function render2FAForm(methods: { totp: boolean; passkey: boolean }) {
    const card = document.getElementById('login-card-content') as HTMLElement;
    card.innerHTML = /*html*/`
        <div class="center-text" style="margin-bottom: 2rem;">
            <h2 class="no-margin">Verify Identity</h2>
        </div>
        <p class="center-text secondary">Your account is protected with 2FA.</p>
        
        ${methods.totp ? `
            <form id="totp-login-form" class="modern-form">
                <label for="totp-code">Authenticator Code</label>
                <input type="text" id="totp-code" placeholder="123456" pattern="[0-9]*" inputmode="numeric" required autofocus>
                <button type="submit" class="primary full-width">Verify Code</button>
            </form>
        ` : ''}

        ${methods.passkey ? `
            <div class="passkey-login-section">
                ${methods.totp ? '<div class="divider" style="margin: 1.5rem 0;"><span>OR</span></div>' : ''}
                <button id="passkey-login-btn" class="secondary full-width">${KEY_SVG} Use Passkey</button>
            </div>
        ` : ''}

        <div class="center-text" style="margin-top: 2rem;">
            <button class="outline secondary" onclick="location.reload()">Back to Login</button>
        </div>
    `;

    if (methods.totp) {
        (document.getElementById('totp-login-form') as HTMLFormElement).onsubmit = async (e) => {
            e.preventDefault();
            const token = (document.getElementById('totp-code') as HTMLInputElement).value;
            try {
                const res = await apiRequest('POST', '/api/auth/verify-totp', { token });
                handleLoginSuccess(res);
            } catch (err: any) {
                notify('Error', err.message, 'error');
            }
        };
    }

    if (methods.passkey) {
        (document.getElementById('passkey-login-btn') as HTMLElement).onclick = () => startPasskeyLogin();
        // Auto-trigger passkey if it's the only method
        if (!methods.totp) startPasskeyLogin();
    }
}

/**
 * Handle view switch to login; redirects to dashboard if already authenticated.
 */
function ViewNavigationEventListener({ resolvedPath }: { resolvedPath: string }) {
    if (resolvedPath === '/login') {
        apiRequest('GET', '/api/auth/status', true).then(((data: any) => {
            if (data.authenticated) {
                const prev = getPreviousPath();
                const badPaths = ['/login', '/signup', '/home'];
                if (!prev || badPaths.includes(prev)) switchView('/events');
                else switchView(prev);
            }
        }));
    }
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form') as HTMLFormElement;
    emailInput = document.getElementById('email') as HTMLInputElement;
    passwordInput = document.getElementById('password') as HTMLInputElement;
    const passkeyBtn = document.getElementById('passkey-login-initial-btn');

    emailInput.addEventListener('input', () => {
        if (emailInput!.value.includes('@')) {
            emailInput!.value = emailInput!.value.split('@')[0];
        }
    });

    if (passkeyBtn) {
        passkeyBtn.onclick = () => {
            let emailVal: string | null = emailInput!.value;
            if (emailVal && emailVal.trim() !== '') {
                if (!emailVal.includes('@')) {
                    emailVal += '@durham.ac.uk';
                }
            } else {
                emailVal = null;
            }
            startPasskeyLogin(emailVal);
        };
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(loginForm);
        let emailVal = formData.get('email') as string;

        let notPresent = false;
        [emailInput!, passwordInput!].forEach(input => {
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
        } catch (error: any) {
            notify('Error', error.message || error || 'Login failed.', 'error', 3000, 'login-status');
            if (error.message && error.message.includes('email')) {
                emailInput!.setAttribute('aria-invalid', 'true');
            }
            if (error.message && error.message.includes('password')) {
                passwordInput!.setAttribute('aria-invalid', 'true');
            }
        }
    });

    ViewChangedEvent.subscribe(ViewNavigationEventListener);
});

document.querySelector('main')!.insertAdjacentHTML('beforeend', HTML_TEMPLATE);

export { LoginEvent };
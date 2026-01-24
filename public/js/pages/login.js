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
import { LOGIN_SVG } from '../../images/icons/outline/icons.js';
import { notify } from '../components/notification.js';

addRoute('/login', 'login');

const HTML_TEMPLATE = /*html*/
    `<div id="login-view" class="view hidden">
            <div class="small-container">
                <h1>Login</h1>
                <div class="form-info">
                    <article class="form-box">
                        <h3>
                            ${LOGIN_SVG}
                            Login to your account
                        </h3>
                        <form id="login-form">
                            <div>
                                <div>
                                    <label for="email">Email:</label>
                                    <div class="durham-email-wrapper">
                                        <input class="nobottommargin" id="email" name="email" placeholder="username" autocomplete="username">
                                        <span class="email-suffix">@durham.ac.uk</span>
                                    </div>
                                </div>
                                <div>
                                    <label for="password">Password:</label>
                                    <input class="nobottommargin" type="password" id="password" name="password">
                                </div>
                            </div>
                            <div id="login-footer">
                                <button class="nobottommargin" type="submit">Login</button>
                            </div>
                        </form>
                        <p class="nobottommargin font-size-0-9 mt-0-5"><a data-nav="/reset-password" class="cursor-pointer">Forgot Password?</a></p>
                        <p class="nobottommargin">Don't have an account? <a data-nav="/signup" class="cursor-pointer">Sign Up</a></p>
                    </article>
                </div>
            </div>
        </div>`;

let email = null;
let password = null;


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

    email.addEventListener('input', () => {
        if (email.value.includes('@')) {
            email.value = email.value.split('@')[0];
        }
    });

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
            notify('Error', 'Please fill in all fields.', 'error', 2000);
            return;
        }

        if (emailVal && !emailVal.includes('@')) {
            emailVal += '@durham.ac.uk';
        }

        await apiRequest('POST', '/api/auth/login', { email: emailVal, password: formData.get('password') }).then(res => {
            LoginEvent.notify({ authenticated: true });
            notify('Success', res.message || 'Login successful! Redirecting...', 'success', 1500);

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
        }).catch((error) => {
            notify('Error', error.message || error || 'Login failed.', 'error', 3000);
            if (error.message.includes('email')) {
                email.setAttribute('aria-invalid', 'true');
            }
            if (error.message.includes('password')) {
                password.setAttribute('aria-invalid', 'true');
            }
        });
    });

    ViewChangedEvent.subscribe(ViewNavigationEventListener);
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);

export { LoginEvent };
import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { switchView, ViewChangedEvent, addRoute } from '/js/utils/view.js';
import { Event } from "/js/utils/event.js";
import { getPreviousPath } from '/js/utils/history.js';
import { LOGIN_SVG } from '../../images/icons/outline/icons.js';

/**
 * User login view management.
 * @module Login
 */

addRoute('/login', 'login');

const HTML_TEMPLATE = /*html*/`<div id="login-view" class="view hidden">
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
                                    <input class="nobottommargin" id="email" name="email">
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
                        <p class="nobottommargin">Don't have an account? <a data-nav="signup" style="cursor: pointer;">Sign Up</a></p>
                    </article>
                </div>
            </div>
        </div>`;

let messageElement = null;
let email = null;
let password = null;

const LoginEvent = new Event();

/**
 * Reset login form fields.
 */
function setupLoginForm() {
    if (messageElement) messageElement.textContent = '';
    if (email) email.value = '';
    if (password) password.value = '';
}

/**
 * Handle view switch to login; redirect if already authenticated.
 * @param {object} params
 */
function ViewNavigationEventListener({ resolvedPath }) {
    if (resolvedPath === '/login') {
        ajaxGet('/api/auth/status').then((data => {
            if (data.authenticated) {
                const prev = getPreviousPath();
                if (!prev || prev === '/login' || prev === '/signup' || prev === '/home') switchView('/events');
                else switchView(prev);
            }
        }));
    }
    setupLoginForm();
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginFooter = document.getElementById('login-footer');
    email = document.getElementById('email');
    password = document.getElementById('password');

    messageElement = document.createElement('div');
    messageElement.id = 'login-message';
    messageElement.setAttribute('role', 'alert');
    messageElement.style.marginBottom = '0';
    loginFooter.appendChild(messageElement);

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(loginForm);

        try {
            await ajaxPost('/api/auth/login', { email: formData.get('email'), password: formData.get('password') });
            LoginEvent.notify({ authenticated: true });

            const prev = getPreviousPath();
            if (!prev || prev === '/login' || prev === '/signup' || prev === '/home') switchView('/events');
            else switchView(prev);
        } catch (error) {
            messageElement.textContent = error || 'Login failed.';
            messageElement.style.color = '#FF6961';
        }
    });

    ViewChangedEvent.subscribe(ViewNavigationEventListener);
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);

export { LoginEvent };
import { ajaxGet, ajaxPost } from './misc/ajax.js';
import { switchView, ViewChangedEvent } from './misc/view.js';
import { Event } from "./misc/event.js";
import { getPreviousPath } from './misc/history.js';

/**
 * User login view management.
 * @module Login
 */

const HTML_TEMPLATE = `<div id="/login-view" class="view hidden">
            <div class="small-container">
                <h1>Login</h1>
                <div class="form-info">
                    <article class="form-box">
                        <h3>
                            <svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M15 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" />
  <path d="M21 12h-13l3 -3" />
  <path d="M11 15l-3 -3" />
</svg>
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
                        <p class="nobottommargin">Don't have an account? <a onclick="switchView('signup')" style="cursor: pointer;">Sign Up</a></p>
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
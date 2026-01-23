/**
 * login.js
 * 
 * Logic for the user login view.
 * Handles credential submission, email normalization (auto-appending domain),
 * and redirects users based on their navigation history.
 * 
 * Registered Route: /login
 */

import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { switchView, ViewChangedEvent, addRoute } from '/js/utils/view.js';
import { LoginEvent } from "/js/utils/events/events.js";
import { getPreviousPath } from '/js/utils/history.js';
import { LOGIN_SVG } from '../../images/icons/outline/icons.js';

// Register route
addRoute('/login', 'login');

/** HTML Template for the login page */
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
                        <p class="nobottommargin font-size-0-9 mt-0-5"><a data-nav="/reset-password" class="cursor-pointer">Forgot Password?</a></p>
                        <p class="nobottommargin">Don't have an account? <a data-nav="/signup" class="cursor-pointer">Sign Up</a></p>
                    </article>
                </div>
            </div>
        </div>`;

/** @type {HTMLElement|null} Element for displaying login error messages */
let messageElement = null;

/** @type {HTMLInputElement|null} Email field handle */
let email = null;

/** @type {HTMLInputElement|null} Password field handle */
let password = null;


/**
 * Resets the login form state.
 */
function setupLoginForm() {
    if (messageElement) messageElement.textContent = '';
    if (email) email.value = '';
    if (password) password.value = '';
}

/**
 * Handle view switch to login; redirects to dashboard if already authenticated.
 * 
 * @param {object} params
 */
function ViewNavigationEventListener({ resolvedPath }) {
    if (resolvedPath === '/login') {
        ajaxGet('/api/auth/status', true).then((data => {
            if (data.authenticated) {
                const prev = getPreviousPath();
                // Avoid infinite loops or logic-dead-ends
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
    loginFooter.appendChild(messageElement);

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(loginForm);
        let emailVal = formData.get('email');

        // Normalize email: append university domain if missing
        if (emailVal && !emailVal.includes('@')) {
            emailVal += '@durham.ac.uk';
        }

        try {
            await ajaxPost('/api/auth/login', { email: emailVal, password: formData.get('password') });
            LoginEvent.notify({ authenticated: true });

            // Prioritize explicit redirect targets set by requireAuth()
            const redirect = sessionStorage.getItem('redirect_after_login');
            sessionStorage.removeItem('redirect_after_login');

            if (redirect) {
                switchView(redirect);
            } else {
                const prev = getPreviousPath();
                if (!prev || prev === '/login' || prev === '/signup' || prev === '/home') switchView('/events');
                else switchView(prev);
            }
        } catch (error) {
            messageElement.textContent = error.message || error || 'Login failed.';
            messageElement.classList.add('error');
        }
    });

    ViewChangedEvent.subscribe(ViewNavigationEventListener);
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);

export { LoginEvent };
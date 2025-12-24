import { ajaxGet, ajaxPost } from './misc/ajax.js';
import { switchView, ViewChangedEvent } from './misc/view.js';
import { Event } from "./misc/event.js";
import { getPreviousPath } from './misc/history.js';

/**
 * Login Module.
 * Manages the login view, including form validation, authentication requests,
 * and intelligent redirection (returning the user to their previous page).
 */

// --- Constants & Templates ---

const HTML_TEMPLATE = `<div id="/login-view" class="view hidden">
            <div class="small-container">
                <h1>Login</h1>
                <div class="form-info">
                    <article class="form-box">
                        <h3>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
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

let messageElement = null; // Container for inline error messages
let email = null;
let password = null;


// --- State ---

/** Event emitted when a user successfully logs in */
const LoginEvent = new Event();

// --- Event Binding ---

/**
 * Resets the login form to its default state.
 */
function setupLoginForm() {
    if (messageElement) messageElement.textContent = '';
    if (email) email.value = '';
    if (password) password.value = '';
}

/**
 * Listener for SPA view changes.
 * Redirects already-authenticated users away from the login page.
 */
function ViewNavigationEventListener({ resolvedPath }) {
    if (resolvedPath === '/login') {
        ajaxGet('/api/auth/status').then((data => {
            if (data.authenticated) {
                // If already logged in, go back or to events
                const previousPath = getPreviousPath();
                if (!previousPath || previousPath === '/login' || previousPath === '/signup' || previousPath === '/home')
                    switchView('/events');
                else {
                    switchView(previousPath);
                }
            }
        }));
    }
    setupLoginForm();
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginFooter = document.getElementById('login-footer');

    email = document.getElementById('email');
    password = document.getElementById('password');

    // Dynamically create message area for errors
    messageElement = document.createElement('div');
    messageElement.id = 'login-message';
    messageElement.setAttribute('role', 'alert');
    messageElement.style.marginBottom = '0';
    loginFooter.appendChild(messageElement);

    // Handle form submission
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(loginForm);
        const emailVal = formData.get('email');
        const passwordVal = formData.get('password');

        try {
            // Perform the authentication request
            await ajaxPost('/api/auth/login', { email: emailVal, password: passwordVal });
            
            // Notify other components (like navbar) of the state change
            LoginEvent.notify({ authenticated: true });

            // Intelligent redirect: go to where they were before, or default to events
            const previousPath = getPreviousPath();
            if (!previousPath || previousPath === '/login' || previousPath === '/signup' || previousPath === '/home')
                switchView('/events');
            else
                switchView(previousPath);
        } catch (error) {
            // Display error feedback
            messageElement.textContent = error || 'Login failed. Please try again.';
            messageElement.style.color = '#FF6961';
            console.error('Login failed:', error);
        }
    });

    ViewChangedEvent.subscribe(ViewNavigationEventListener);
});

// Inject template into the main layout
document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);

export { LoginEvent };

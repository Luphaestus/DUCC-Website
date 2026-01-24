/**
 * signup.js
 * 
 * Logic for the user registration view.
 * 
 * Registered Route: /signup
 */

import { apiRequest } from '/js/utils/api.js';
import { switchView, addRoute, ViewChangedEvent } from '/js/utils/view.js';
import { notify } from '/js/components/notification.js';
import { ACCOUNT_BOX_SVG } from '../../images/icons/outline/icons.js';

addRoute('/signup', 'signup');

const HTML_TEMPLATE = /*html*/`
        <div id="signup-view" class="view hidden">
            <div class="small-container">
                <h1>Sign Up</h1>
                <div class="form-info">
                    <article class="form-box">
                        <h3>
                            ${ACCOUNT_BOX_SVG}
                            Create Account
                        </h3>
                        <form id="signup-form">
                            <div>
                                <div class="grid">
                                    <div>
                                        <label for="first-name">First Name:</label>
                                        <input type="text" id="signup-first-name" name="first-name" placeholder="First Name" autocomplete="given-name">
                                    </div>
                                    <div>
                                        <label for="last-name">Last Name:</label>
                                        <input type="text" id="signup-last-name" name="last-name" placeholder="Last Name" autocomplete="family-name">
                                    </div>
                                </div>
                                <div>
                                    <label for="email">Email:</label>
                                    <div class="durham-email-wrapper">
                                        <input type="text" id="signup-email" name="email" placeholder="username" autocomplete="username">
                                        <span class="email-suffix">@durham.ac.uk</span>
                                    </div>
                                </div>
                                <div class="grid">
                                    <div>
                                        <label for="password">Password:</label>
                                        <input type="password" id="signup-password" name="password" autocomplete="new-password">
                                    </div>
                                    <div>
                                        <label for="confirm-password">Confirm Password:</label>
                                        <input type="password" id="signup-confirm-password" name="confirm-password" autocomplete="new-password">
                                    </div>
                                </div>
                            </div>
                            <div id="signup-footer">
                                <button type="submit">Sign Up</button>
                            </div>
                        </form>
                    </article>
                </div>
            </div>
        </div>`;

let firstName = null;
let lastName = null;
let email = null;
let password = null;
let confirmPassword = null;

/**
 * Resets the signup form state and redirects authenticated users away.
 * 
 * @param {object} params
 */
async function NavigationEventListner({ resolvedPath }) {
    if (resolvedPath !== '/signup') return;

    const authenticated = await apiRequest('GET', '/api/auth/status').then(data => data.authenticated).catch(() => false);
    if (authenticated) {
        switchView('/events');
        return;
    }

    [firstName, lastName, email, password, confirmPassword].forEach(el => {
        if (el) { el.value = ''; el.removeAttribute('aria-invalid'); }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');

    if (!signupForm) return;

    firstName = document.getElementById('signup-first-name');
    lastName = document.getElementById('signup-last-name');
    email = document.getElementById('signup-email');
    password = document.getElementById('signup-password');
    confirmPassword = document.getElementById('signup-confirm-password');

    [firstName, lastName, email, password, confirmPassword].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                input.removeAttribute('aria-invalid');
            });
        }
    });

    let emailModified = false;

    firstName.addEventListener('input', () => {
        if (emailModified) return;

        const dot = (firstName.value !== '' && lastName.value !== '') ? '.' : '';
        email.value = `${firstName.value.toLowerCase()}${dot}${lastName.value.toLowerCase()}`;
    });

    lastName.addEventListener('input', () => {
        if (emailModified) return;

        const dot = (firstName.value !== '' && lastName.value !== '') ? '.' : '';
        email.value = `${firstName.value.toLowerCase()}${dot}${lastName.value.toLowerCase()}`;
    });

    email.addEventListener('input', () => {
        emailModified = true;
        if (email.value.includes('@')) {
            email.value = email.value.split('@')[0];
        }
    });

    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const fields = [firstName, lastName, email, password, confirmPassword];
        fields.forEach(field => {
            field.removeAttribute('aria-invalid');
            if (!field.value || field.value.trim() === '') {
                field.setAttribute('aria-invalid', 'true');
            }
        });


        if (password.value !== confirmPassword.value) {
            confirmPassword.setAttribute('aria-invalid', 'true');
            notify('Error', 'Passwords do not match', 'error', 2000);
            return;
        }

        let emailVal = email.value;
        if (emailVal && !emailVal.includes('@')) {
            emailVal += '@durham.ac.uk';
        }

        try {
            await apiRequest('POST', '/api/auth/signup', {
                first_name: firstName.value,
                last_name: lastName.value,
                email: emailVal,
                password: password.value
            });
            notify('Success', 'Sign up successful! Redirecting...', 'success',  1000);
            setTimeout(() => switchView('/login'), 1000);
        } catch (error) {
            if (error.errors) {
                if (error.errors.email) email.setAttribute('aria-invalid', 'true');
                if (error.errors.first_name) firstName.setAttribute('aria-invalid', 'true');
                if (error.errors.last_name) lastName.setAttribute('aria-invalid', 'true');
                if (error.errors.password) password.setAttribute('aria-invalid', 'true');
            }
            notify('Error', error.message || error || 'Sign up failed.', 'error', 2000);
        }
    });

    ViewChangedEvent.subscribe(NavigationEventListner);
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);
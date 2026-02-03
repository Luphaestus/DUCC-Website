/**
 * signup.js
 * 
 * Logic for the user registration view.
 * 
 * Registered Route: /signup
 */

import { apiRequest } from '@/utils/api';
import { switchView, addRoute, ViewChangedEvent } from '@/utils/view';
import { notify } from '@/components/notification';
import { ACCOUNT_BOX_SVG } from '@/utils/icons';

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

let firstName: HTMLInputElement | null = null;
let lastName: HTMLInputElement | null = null;
let email: HTMLInputElement | null = null;
let password: HTMLInputElement | null = null;
let confirmPassword: HTMLInputElement | null = null;

/**
 * Resets the signup form state and redirects authenticated users away.
 * 
 * @param {any} params
 */
async function NavigationEventListner({ resolvedPath }: any): Promise<void> {
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

    firstName = document.getElementById('signup-first-name') as HTMLInputElement;
    lastName = document.getElementById('signup-last-name') as HTMLInputElement;
    email = document.getElementById('signup-email') as HTMLInputElement;
    password = document.getElementById('signup-password') as HTMLInputElement;
    confirmPassword = document.getElementById('signup-confirm-password') as HTMLInputElement;

    [firstName, lastName, email, password, confirmPassword].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                input.removeAttribute('aria-invalid');
            });
        }
    });

    let emailModified = false;

    if (firstName) {
        firstName.addEventListener('input', () => {
            if (emailModified || !firstName || !lastName || !email) return;

            const dot = (firstName.value !== '' && lastName.value !== '') ? '.' : '';
            email.value = `${firstName.value.toLowerCase()}${dot}${lastName.value.toLowerCase()}`;
        });
    }

    if (lastName) {
        lastName.addEventListener('input', () => {
            if (emailModified || !firstName || !lastName || !email) return;

            const dot = (firstName.value !== '' && lastName.value !== '') ? '.' : '';
            email.value = `${firstName.value.toLowerCase()}${dot}${lastName.value.toLowerCase()}`;
        });
    }

    if (email) {
        email.addEventListener('input', () => {
            emailModified = true;
            if (email && email.value.includes('@')) {
                email.value = email.value.split('@')[0];
            }
        });
    }

    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const fields = [firstName, lastName, email, password, confirmPassword];
        fields.forEach(field => {
            if (field) {
                field.removeAttribute('aria-invalid');
                if (!field.value || field.value.trim() === '') {
                    field.setAttribute('aria-invalid', 'true');
                }
            }
        });


        if (password && confirmPassword && password.value !== confirmPassword.value) {
            confirmPassword.setAttribute('aria-invalid', 'true');
            notify('Error', 'Passwords do not match', 'error', 2000, 'signup-status');
            return;
        }

        let emailVal = email?.value;
        if (emailVal && !emailVal.includes('@')) {
            emailVal += '@durham.ac.uk';
        }

        try {
            if (!firstName || !lastName || !email || !password) return;
            await apiRequest('POST', '/api/auth/signup', {
                first_name: firstName.value,
                last_name: lastName.value,
                email: emailVal,
                password: password.value
            });
            notify('Success', 'Sign up successful! Redirecting...', 'success',  1000, 'signup-status');
            setTimeout(() => switchView('/login'), 1000);
        } catch (error: any) {
            if (error.errors) {
                if (error.errors.email && email) email.setAttribute('aria-invalid', 'true');
                if (error.errors.first_name && firstName) firstName.setAttribute('aria-invalid', 'true');
                if (error.errors.last_name && lastName) lastName.setAttribute('aria-invalid', 'true');
                if (error.errors.password && password) password.setAttribute('aria-invalid', 'true');
            }
            notify('Error', error.message || error || 'Sign up failed.', 'error', 2000, 'signup-status');
        }
    });

    ViewChangedEvent.subscribe(NavigationEventListner);
});

const mainEl = document.querySelector('main');
if (mainEl) mainEl.insertAdjacentHTML('beforeend', HTML_TEMPLATE);
import { ajaxGet, ajaxPost } from './misc/ajax.js';
import { switchView } from './misc/view.js';
import { ViewChangedEvent } from './misc/view.js';

/**
 * User registration view management.
 * @module Signup
 */

const HTML_TEMPLATE = `<div id="/signup-view" class="view hidden">
            <div class="small-container">
                <h1>Sign Up</h1>
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
  <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
  <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
</svg>
                            Create Account
                        </h3>
                        <form id="signup-form">
                            <div>
                                <div>
                                    <label for="first-name">First Name:</label>
                                    <input class="nobottommargin" type="text" id="signup-first-name" name="first-name">
                                </div>
                                <div>
                                    <label for="last-name">Last Name:</label>
                                    <input class="nobottommargin" type="text" id="signup-last-name" name="last-name">
                                </div>
                                <div>
                                    <label for="email">Email:</label>
                                    <input class="nobottommargin" type="email" id="signup-email" name="email">
                                </div>
                                <div>
                                    <label for="password">Password:</label>
                                    <input class="nobottommargin" type="password" id="signup-password" name="password">
                                </div>
                                <div>
                                    <label for="confirm-password">Confirm Password:</label>
                                    <input class="nobottommargin" type="password" id="signup-confirm-password" name="confirm-password">
                                </div>
                            </div>
                            <div id="signup-footer">
                                <button class="nobottommargin" type="submit">Sign Up</button>
                            </div>
                        </form>
                    </article>
                </div>
            </div>
        </div>`;

let messageElement = null;
let firstName = null;
let lastName = null;
let email = null;
let password = null;
let confirmPassword = null;
let validationMessages = {};

/**
 * Reset signup form and redirect authenticated users.
 */
async function NavigationEventListner({ resolvedPath }) {
    if (resolvedPath !== '/signup') return;

    const authenticated = await ajaxGet('/api/auth/status').then(data => data.authenticated).catch(() => false);
    if (authenticated) {
        switchView('/events');
        return;
    }

    if (messageElement) messageElement.classList.add('hidden');
    [firstName, lastName, email, password, confirmPassword].forEach(el => {
        if (el) { el.value = ''; el.removeAttribute('aria-invalid'); }
    });

    clearValidationMessages();
}

/**
 * Show general form error.
 * @param {string} error
 */
function displayError(error) {
    if (messageElement) {
        messageElement.classList.remove('hidden');
        messageElement.textContent = error;
        messageElement.style.color = '#FF6961';
    }
}

/**
 * Show validation message for a specific field.
 * @param {HTMLElement} inputElement
 * @param {string} message
 */
function displayValidationMessage(inputElement, message) {
    let messageId = `validation-message-${inputElement.id}`;
    let existingMessage = document.getElementById(messageId);
    if (!existingMessage) {
        existingMessage = document.createElement('p');
        existingMessage.id = messageId;
        existingMessage.classList.add('validation-message');
        inputElement.parentNode.insertBefore(existingMessage, inputElement.nextSibling);
    }
    existingMessage.textContent = message;
    existingMessage.style.color = '#FF6961';
    existingMessage.style.fontSize = '0.8em';
    existingMessage.style.marginTop = '0.2em';
    validationMessages[inputElement.id] = existingMessage;
}

/**
 * Clear all validation messages.
 */
function clearValidationMessages() {
    for (const inputId in validationMessages) {
        if (validationMessages[inputId]) validationMessages[inputId].remove();
    }
    validationMessages = {};
}

/**
 * Validate input against pattern.
 * @param {HTMLElement} inputElement
 * @param {RegExp} pattern
 * @param {string} errorMessage
 * @returns {boolean}
 */
function validateInput(inputElement, pattern, errorMessage) {
    if (!pattern.test(inputElement.value)) {
        inputElement.ariaInvalid = 'true';
        displayValidationMessage(inputElement, errorMessage);
        return false;
    } else {
        inputElement.ariaInvalid = 'false';
        if (validationMessages[inputElement.id]) {
            validationMessages[inputElement.id].remove();
            delete validationMessages[inputElement.id];
        }
        return true;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const signupFooter = document.getElementById('signup-footer');

    if (!signupForm) return;

    messageElement = document.createElement('div');
    messageElement.id = 'signup-message';
    messageElement.setAttribute('role', 'alert');
    messageElement.style.marginBottom = '0';
    signupFooter.appendChild(messageElement);

    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        messageElement.classList.add('hidden');
        clearValidationMessages();

        firstName = document.getElementById('signup-first-name');
        lastName = document.getElementById('signup-last-name');
        email = document.getElementById('signup-email');
        password = document.getElementById('signup-password');
        confirmPassword = document.getElementById('signup-confirm-password');

        const nameRegex = /^[a-zA-Z'-]{1,50}$/;
        const emailRegex = /^[^@]+\.[^@]+@durham\.ac\.uk$/i;

        const isFirstNameValid = validateInput(firstName, nameRegex, 'Invalid first name.');
        const isLastNameValid = validateInput(lastName, nameRegex, 'Invalid last name.');
        const isEmailValid = validateInput(email, emailRegex, 'Invalid email format (must be @durham.ac.uk).');

        if (password.value === "") {
            displayValidationMessage(password, 'Password required.');
            password.ariaInvalid = 'true';
        }

        if (password.value !== confirmPassword.value) {
            displayValidationMessage(confirmPassword, 'Passwords do not match.');
            confirmPassword.ariaInvalid = 'true';
        }

        if (!isFirstNameValid || !isLastNameValid || !isEmailValid || password.value === "" || password.value !== confirmPassword.value) return;

        try {
            await ajaxPost('/api/auth/signup', { first_name: firstName.value, last_name: lastName.value, email: email.value, password: password.value });
            messageElement.textContent = 'Sign up successful! Redirecting...';
            messageElement.style.color = 'green';
            messageElement.classList.remove('hidden');
            setTimeout(() => switchView('/login'), 1000);
        } catch (error) {
            displayError(error || 'Sign up failed.');
        }
    });

    ViewChangedEvent.subscribe(NavigationEventListner);
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);
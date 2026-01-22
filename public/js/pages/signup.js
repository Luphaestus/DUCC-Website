/**
 * signup.js
 * 
 * Logic for the user registration view.
 * Handles new account creation, interactive field-level validation,
 * and email normalization.
 * 
 * Registered Route: /signup
 */

import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { switchView, addRoute, ViewChangedEvent } from '/js/utils/view.js';
import { ACCOUNT_BOX_SVG } from '../../images/icons/outline/icons.js';

// Register route
addRoute('/signup', 'signup');

/** HTML Template for the signup page */
const HTML_TEMPLATE = /*html*/`<div id="signup-view" class="view hidden">
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

/** @type {HTMLElement|null} General error message element */
let messageElement = null;

/** Handles to input fields for value resetting */
let firstName = null;
let lastName = null;
let email = null;
let password = null;
let confirmPassword = null;

/** @type {Object<string, HTMLElement>} Active validation messages map */
let validationMessages = {};

/**
 * Resets the signup form state and redirects authenticated users away.
 * 
 * @param {object} params
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
 * Displays a general form error message.
 * 
 * @param {string} error 
 */
function displayError(error) {
    if (messageElement) {
        messageElement.classList.remove('hidden');
        messageElement.textContent = error;
        messageElement.classList.add('error');
        messageElement.classList.remove('success');
    }
}

/**
 * Injects a field-level validation message.
 * 
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
    validationMessages[inputElement.id] = existingMessage;
    inputElement.ariaInvalid = 'true';
}

/**
 * Clears all currently displayed validation messages.
 */
function clearValidationMessages() {
    for (const inputId in validationMessages) {
        if (validationMessages[inputId]) validationMessages[inputId].remove();
        const input = document.getElementById(inputId);
        if (input) input.removeAttribute('aria-invalid');
    }
    validationMessages = {};
}

/**
 * Removes validation state from a specific input.
 * 
 * @param {HTMLElement} inputElement 
 */
function clearInputError(inputElement) {
    if (validationMessages[inputElement.id]) {
        validationMessages[inputElement.id].remove();
        delete validationMessages[inputElement.id];
    }
    inputElement.removeAttribute('aria-invalid');
}

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const signupFooter = document.getElementById('signup-footer');

    if (!signupForm) return;

    messageElement = document.createElement('div');
    messageElement.id = 'signup-message';
    messageElement.setAttribute('role', 'alert');
    signupFooter.appendChild(messageElement);

    // Collect field handles
    firstName = document.getElementById('signup-first-name');
    lastName = document.getElementById('signup-last-name');
    email = document.getElementById('signup-email');
    password = document.getElementById('signup-password');
    confirmPassword = document.getElementById('signup-confirm-password');

    // Attach real-time error clearing
    [firstName, lastName, email, password, confirmPassword].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                clearInputError(input);
                if (messageElement) messageElement.classList.add('hidden');
            });
        }
    });

    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        messageElement.classList.add('hidden');
        clearValidationMessages();

        // Passwords must match exactly
        if (password.value !== confirmPassword.value) {
            displayValidationMessage(confirmPassword, 'Passwords do not match.');
            return;
        }

        let emailVal = email.value;
        // Auto-append domain if simple username entered
        if (emailVal && !emailVal.includes('@')) {
            emailVal += '@durham.ac.uk';
        }

        try {
            await ajaxPost('/api/auth/signup', { first_name: firstName.value, last_name: lastName.value, email: emailVal, password: password.value });
            messageElement.textContent = 'Sign up successful! Redirecting...';
            messageElement.classList.add('success');
            messageElement.classList.remove('error', 'hidden');
            setTimeout(() => switchView('/login'), 1000);
        } catch (error) {
            // Handle field-specific errors returned by API validation
            if (error.errors) {
                if (error.errors.email) displayValidationMessage(email, error.errors.email);
                if (error.errors.first_name) displayValidationMessage(firstName, error.errors.first_name);
                if (error.errors.last_name) displayValidationMessage(lastName, error.errors.last_name);
                if (error.errors.password) displayValidationMessage(password, error.errors.password);
            }
            displayError(error.message || error || 'Sign up failed.');
        }
    });

    ViewChangedEvent.subscribe(NavigationEventListner);
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);
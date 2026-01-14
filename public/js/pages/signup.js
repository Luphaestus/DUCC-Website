import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { switchView, addRoute, ViewChangedEvent } from '/js/utils/view.js';
import { ACCOUNT_BOX_SVG } from '../../images/icons/outline/icons.js';

/**
 * User registration view management.
 * @module Signup
 */

addRoute('/signup', 'signup');

const HTML_TEMPLATE = `<div id="signup-view" class="view hidden">
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
        const isEmailValid = validateInput(email, emailRegex, 'Invalid email format (must be first.last@durham.ac.uk).');

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
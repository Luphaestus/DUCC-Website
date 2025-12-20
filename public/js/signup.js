import { ajaxGet, ajaxPost } from './misc/ajax.js';
import { switchView } from './misc/view.js';
import { ViewChangedEvent } from './misc/view.js';

// --- Constants & Templates ---

const HTML_TEMPLATE = `<div id="/signup-view" class="view hidden">
            <div class="small-container">
                <h1>Sign Up</h1>
                <div class="form-info">
                    <article class="form-box">
                        <h3>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
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

// --- State ---

let messageElement = null;
let firstName = null;
let lastName = null;
let email = null;
let password = null;
let confirmPassword = null;
let validationMessages = {};

// --- Helper Functions ---

/**
 * Handles navigation events for the signup view.
 * @param {object} params - The navigation event parameters containing the resolved path.
 */
async function NavigationEventListner({ resolvedPath }) {
    if (resolvedPath !== '/signup') return;

    const authenticated = await ajaxGet('/api/auth/status').then(data => data.authenticated).catch(() => false);
    if (authenticated) {
        switchView('/events');
        return;
    }

    if (messageElement) messageElement.classList.add('hidden');
    if (firstName) {
        firstName.value = '';
        firstName.removeAttribute('aria-invalid');
    }
    if (lastName) {
        lastName.value = '';
        lastName.removeAttribute('aria-invalid');
    }
    if (email) {
        email.value = '';
        email.removeAttribute('aria-invalid');
    }
    if (password) {
        password.value = '';
        password.removeAttribute('aria-invalid');
    }
    if (confirmPassword) {
        confirmPassword.value = '';
        confirmPassword.removeAttribute('aria-invalid');
    }

    clearValidationMessages();
}

/**
 * Displays an error message
 * @param {string} error - The error message to display.
 */
function displayError(error) {
    if (messageElement) {
        messageElement.classList.remove('hidden');
        messageElement.textContent = error;
        messageElement.style.color = '#FF6961';
    }
}

/**
 * Displays a validation message below the specified input field.
 * @param {HTMLElement} inputElement - The input element to display the message for.
 * @param {string} message - The validation message.
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
 * Clears all validation messages.
 */
function clearValidationMessages() {
    for (const inputId in validationMessages) {
        if (validationMessages[inputId]) {
            validationMessages[inputId].remove();
        }
    }
    validationMessages = {};
}

/**
 * Validates a single input field against a regex pattern and displays a message if invalid.
 * @param {HTMLElement} inputElement - The input element to validate.
 * @param {RegExp} pattern - The regex pattern to test against.
 * @param {string} errorMessage - The message to display if validation fails.
 * @returns {boolean} True if valid, false otherwise.
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

// --- Initialization ---

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

        validateInput(firstName, nameRegex, 'First name can only contain letters, hyphens, and apostrophes.');
        validateInput(lastName, nameRegex, 'Last name can only contain letters, hyphens, and apostrophes.');

        const emailRegex = /^[^@]+\.[^@]+@durham\.ac\.uk$/i;
        validateInput(email, emailRegex, 'Invalid email format. Must be a first.last@durham.ac.uk address.');

        if (password.value == "") {
            displayValidationMessage(password, 'Password cannot be empty.');
            password.ariaInvalid = 'true';
            displayValidationMessage(confirmPassword, 'Password cannot be empty.');
            confirmPassword.ariaInvalid = 'true';
        }

        if (password.value !== confirmPassword.value) {
            displayValidationMessage(confirmPassword, 'Passwords do not match.');
            confirmPassword.ariaInvalid = 'true';
        }

        if (password.value !== confirmPassword.value) {
            displayError('Passwords do not match.');
            return;
        }


        const data = {
            first_name: firstName.value,
            last_name: lastName.value,
            email: email.value,
            password: password.value
        };

        try {
            await ajaxPost('/api/auth/signup', data);
            messageElement.textContent = 'Sign up successful! Redirecting to login...';
            messageElement.style.color = 'green';
            setTimeout(() => switchView('/login'), 1000);
        } catch (error) {
            displayError(error || 'Sign up failed. Please try again.');
        }
    });

    ViewChangedEvent.subscribe(NavigationEventListner);
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);
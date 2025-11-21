import { ajaxPost } from './misc/ajax.js';
import { switchView } from './misc/view.js';

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    if (!signupForm) return;

    // Create a message element to provide feedback to the user
    const messageElement = document.createElement('div');
    messageElement.id = 'signup-message';
    messageElement.setAttribute('role', 'alert');
    signupForm.appendChild(messageElement);

    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        messageElement.textContent = ''; // Clear previous messages

        const firstName = document.getElementById('signup-first-name').value;
        const lastName = document.getElementById('signup-last-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        const data = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            password: password
        };

        try {
            await ajaxPost('/api/signup', data);
            messageElement.textContent = 'Sign up successful! Redirecting to login...';
            messageElement.style.color = 'green';
            setTimeout(() => switchView('/login'), 2000);
        } catch (error) {
            messageElement.textContent = error.message || 'Sign up failed. Please try again.';
            messageElement.style.color = 'red';
        }
    });
});

import { ajaxPost } from './misc/ajax.js';
import { switchView } from './misc/view.js';
import { Event } from "./misc/event.js";
import { getPreviousPath } from './misc/history.js';


const LoginEvent = new Event();

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginMessage = document.getElementById('login-message');
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(loginForm);
        const email = formData.get('email');
        const password = formData.get('password');

        try {
            await ajaxPost('/api/login', { email, password });
            LoginEvent.notify({ loggedIn: true });

            const previousPath = getPreviousPath();
            if (!previousPath || previousPath === '/login' || previousPath === '/signup' || previousPath === '/home')
                switchView('/events');
            else
                switchView(previousPath);
        } catch (error) {
            console.error('Login failed:', error);
            loginMessage.textContent = 'Login failed. Please try again.';
            loginMessage.style.color = 'red';
        }
    });
});

export { LoginEvent };
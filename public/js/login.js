import { ajaxPost, ajaxGet } from './misc/ajax.js';
import { switchView } from './misc/view.js';
import { setup_login_button } from './navbar.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginMessage = document.getElementById('login-message');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(loginForm);
        const email = formData.get('email');
        const password = formData.get('password');

        ajaxPost('/api/login', { email, password }, (response) => {
            setup_login_button();
            switchView('events');
        }, (error) => {
            console.error('Login failed:', error);
            loginMessage.textContent = 'Login failed. Please try again.';
            loginMessage.style.color = 'red';
        });
    });
});
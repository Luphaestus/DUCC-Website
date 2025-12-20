import { switchView } from './misc/view.js';
import { ajaxGet } from './misc/ajax.js';
import { Event } from './misc/event.js';
import { LoginEvent } from './login.js';

// --- Constants & Events ---

const navEntries = [
    { name: 'Home', type: 'text', classes: "contrast", action: { run: () => switchView('/home') } },
    { name: 'Events', type: 'text', classes: "contrast", action: { run: () => switchView('/events') } },
    { name: 'Login', id: 'login-button', type: 'button', action: { run: () => switchView('/login') } },
    { name: 'Profile', id: 'profile-button', type: 'button', action: { run: () => switchView('/profile') } }
];

const FirstNameChangedEvent = new Event();

// --- Helper Functions ---

/**
 * Fetches the user's first name and updates the profile button text.
 * @returns {Promise<void>}
 */
async function updateFirstNameInNav() {
    const profileButton = document.getElementById('profile-button');
    profileButton.textContent = await ajaxGet('/api/user/elements/first_name').then((data) => `Hello, ${data.first_name}`);
}

/**
 * Formats navigation items. 
 * @param {object} entry - The navigation entry object containing name, type, contrast, and action.
 * @returns {HTMLElement} The created list item element.
 */
function create_item(entry) {
    const li = document.createElement('li');

    let clicky;
    switch (entry.type) {
        case 'button':
            clicky = document.createElement('button');
            break;
        case 'text':
        default:
            clicky = document.createElement('a');
            break;
    }

    if (entry.classes) clicky.className = entry.classes;
    clicky.id = entry.id || `nav-${entry.name.toLowerCase()}`;
    clicky.textContent = entry.name;

    switch (typeof entry.action) {
        case 'string':
            clicky.href = entry.action;
            break;
        case 'object':
            clicky.style.cursor = 'pointer';
            clicky.addEventListener('click', () => {
                if (typeof entry.action === 'object' && entry.action !== null) {
                    entry.action.run?.();
                }
            });
            break;
        default:
            break;
    }

    li.appendChild(clicky);
    return li;
}

/**
 * Updates the navigation bar based on the user's login state.
 * @param {object} data - An object containing the login state, e.g., { loggedIn: true }.
 */
async function updateNavOnLoginState(data) {
    const isLoggedIn = data.authenticated;

    const loginButton = document.getElementById('login-button');
    const loginLi = loginButton?.parentElement;
    const profileButton = document.getElementById('profile-button');
    const profileLi = profileButton?.parentElement;

    if (!loginButton || !profileButton) {
        console.warn("Login or Profile button not found in navbar.");
        return;
    }

    if (isLoggedIn) {
        loginLi.classList.add('hidden');
        profileLi.classList.remove('hidden');
        updateFirstNameInNav();
    } else {
        loginLi.classList.remove('hidden');
        profileLi.classList.add('hidden');
    }
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    const navbarList = document.querySelector('.navbar-items');
    if (!navbarList) return;

    for (const entry of navEntries) {
        navbarList.appendChild(create_item(entry));
    }

    ajaxGet('/api/auth/status').then(updateNavOnLoginState).catch(() => updateNavOnLoginState({ authenticated: false }));
    LoginEvent.subscribe((data) => {
        updateNavOnLoginState(data);
    });
    FirstNameChangedEvent.subscribe(() => {
        updateFirstNameInNav();
    });
});

export { FirstNameChangedEvent };
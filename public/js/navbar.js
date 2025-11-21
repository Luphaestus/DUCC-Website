import { switchView } from './misc/view.js';
import { ajaxGet } from './misc/ajax.js';
import { LoginEvent } from './login.js';

const navEntries = [
    { name: 'Home', type: 'text', classes: "contrast", action: { run: () => switchView('/home') } },
    { name: 'Events', type: 'text', classes: "contrast", action: { run: () => switchView('/events') } },
    { name: 'Login', id: 'login-button', type: 'button', action: { run: () => switchView('/login') } },
    { name: 'Profile', id: 'profile-button', type: 'button', classes: "hidden", action: { run: () => switchView('/profile') } }
];

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
    const isLoggedIn = data.loggedIn;

    const loginButton = document.getElementById('login-button');
    const profileButton = document.getElementById('profile-button');

    if (!loginButton || !profileButton) {
        console.warn("Login or Profile button not found in navbar.");
        return;
    }

    if (isLoggedIn) {
        loginButton.classList.add('hidden');
        profileButton.classList.remove('hidden');
        profileButton.textContent = await ajaxGet('/api/user/name').then((data) => `Hello, ${data.name.first_name}`).catch(() => "Profile");
    } else {
        loginButton.classList.remove('hidden');
        profileButton.classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const navbarList = document.querySelector('.navbar-items');
    if (!navbarList) return;

    for (const entry of navEntries) {
        navbarList.appendChild(create_item(entry));
    }

    ajaxGet('/api/user/loggedin').then(updateNavOnLoginState).catch(() => updateNavOnLoginState({ loggedIn: false }));

    LoginEvent.subscribe((data) => {
        updateNavOnLoginState(data);
    });
});

export { };
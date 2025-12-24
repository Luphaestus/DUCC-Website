import { switchView } from './misc/view.js';
import { ajaxGet } from './misc/ajax.js';
import { Event } from './misc/event.js';
import { LoginEvent } from './login.js';

/**
 * Navbar Module.
 * Manages the top navigation bar, including dynamic item generation,
 * authentication-aware visibility (Login vs Profile vs Admin),
 * and user-specific greetings.
 */

// --- Constants & Events ---

/**
 * Configuration for navigation entries.
 * 'type' determines the tag (a vs button).
 * 'action' defines what happens when clicked (usually an SPA view switch).
 */
const navEntries = [
    { name: 'Home', type: 'text', classes: "contrast", action: { run: () => switchView('/home') } },
    { name: 'Events', type: 'text', classes: "contrast", action: { run: () => switchView('/events') } },
    { name: 'Admin', id: 'admin-button', type: 'text', classes: "contrast", action: { run: () => switchView('/admin/') } },
    { name: 'Login', id: 'login-button', type: 'button', action: { run: () => switchView('/login') } },
    { name: 'Profile', id: 'profile-button', type: 'button', action: { run: () => switchView('/profile') } }
];

// Event to signal when the user's name has been changed (e.g., in profile settings)
const FirstNameChangedEvent = new Event();

// --- Helper Functions ---

/**
 * Fetches the user's first name from the server and updates the profile button text.
 * @returns {Promise<void>}
 */
async function updateFirstNameInNav() {
    const profileButton = document.getElementById('profile-button');
    if (profileButton) {
        profileButton.textContent = await ajaxGet('/api/user/elements/first_name').then((data) => `Hello, ${data.first_name}`);
    }
}

/**
 * Creates a DOM element for a navigation item.
 * @param {object} entry - The navigation entry configuration.
 * @returns {HTMLElement} The <li> element containing the link or button.
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

    // Handle both href-style and callback-style actions
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
 * Updates the navigation bar visibility and content based on the current login state.
 * Handles the toggling of 'Login' vs 'Profile' and the 'Admin' button visibility.
 * @param {object} data - The authentication state data { authenticated: boolean }.
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
        // Logged in: Hide login, show profile
        loginLi.classList.add('hidden');
        profileLi.classList.remove('hidden');
        
        // Fetch user data and permissions in parallel
        const [userData, permissions] = await Promise.all([
            ajaxGet('/api/user/elements/first_name'),
            ajaxGet('/api/user/elements/can_manage_users,can_manage_events,is_exec').catch(() => null)
        ]);

        if (userData && userData.first_name) {
            profileButton.textContent = `Hello, ${userData.first_name}`;
        }

        const adminButton = document.getElementById('admin-button');
        const adminLi = adminButton?.parentElement;

        // Show Admin button if user has any management permissions
        if (permissions && (permissions.can_manage_users || permissions.can_manage_events || permissions.is_exec)) {
            adminLi.classList.remove('hidden');
        } else {
            adminLi.classList.add('hidden');
        }
    } else {
        // Logged out: Show login, hide profile and admin
        loginLi.classList.remove('hidden');
        profileLi.classList.add('hidden');
        document.getElementById('admin-button')?.parentElement?.classList.add('hidden');
    }
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    const navbarList = document.querySelector('.navbar-items');
    if (!navbarList) return;

    // Construct the initial navbar from configuration
    for (const entry of navEntries) {
        navbarList.appendChild(create_item(entry));
    }

    // Initial check for authentication status
    ajaxGet('/api/auth/status').then(updateNavOnLoginState).catch(() => updateNavOnLoginState({ authenticated: false }));
    
    // Subscribe to login/logout events
    LoginEvent.subscribe((data) => {
        updateNavOnLoginState(data);
    });
    
    // Subscribe to profile update events
    FirstNameChangedEvent.subscribe(() => {
        updateFirstNameInNav();
    });
});

export { FirstNameChangedEvent };
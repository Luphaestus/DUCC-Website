import { switchView, ViewChangedEvent } from './misc/view.js';
import { ajaxGet } from './misc/ajax.js';
import { Event } from './misc/event.js';
import { LoginEvent } from './login.js';
import { BalanceChangedEvent } from './misc/globals.js';

// --- Constants & Events ---

/**
 * Configuration for navigation entries.
 * 'type' determines the tag (a vs button).
 * 'action' defines what happens when clicked (usually an SPA view switch).
 */
const navEntries = [
    { name: 'Events', type: 'text', classes: "contrast", action: { run: () => switchView('/events') } },
    { name: 'Admin', id: 'admin-button', type: 'text', classes: "contrast", action: { run: () => switchView('/admin/') } },
    { name: 'Balance: £0.00', id: 'balance-button', type: 'text', classes: "contrast", action: { run: () => switchView('/transactions') } },
    { name: 'Login', id: 'login-button', type: 'button', action: { run: () => switchView('/login') } },
    { name: 'Profile', id: 'profile-button', type: 'button', action: { run: () => switchView('/profile') } }
];

// Event to signal when the user's name has been changed (e.g., in profile settings)
const FirstNameChangedEvent = new Event();

// --- Helper Functions ---

/**
 * Fetches and updates the user's balance in the navbar.
 */
async function updateBalanceInNav() {
    const balanceButton = document.getElementById('balance-button');
    if (balanceButton) {
        const data = await ajaxGet('/api/user/elements/balance').catch(() => null);
        if (data && data.balance !== undefined) {
            const balance = Number(data.balance);
            balanceButton.textContent = `Balance: £${balance.toFixed(2)}`;
            
            if (balance < -20) {
                balanceButton.style.color = '#e74c3c'; // Red
            } else if (balance < -10) {
                balanceButton.style.color = '#f1c40f'; // Yellow
            } else {
                balanceButton.style.color = '';
            }
        }
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
    clicky.id = entry.id || `nav-${entry.name.toLowerCase().replace(/[^a-z]/g, '')}`;
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
    const balanceButton = document.getElementById('balance-button');
    const balanceLi = balanceButton?.parentElement;

    if (!loginButton || !profileButton) {
        console.warn("Login or Profile button not found in navbar.");
        return;
    }

    if (isLoggedIn) {
        // Logged in: Hide login, show profile and balance
        loginLi.classList.add('hidden');
        profileLi.classList.remove('hidden');
        if (balanceLi) balanceLi.classList.remove('hidden');
        
        // Fetch permissions, balance, and swims in parallel
        const [permissions, swimData] = await Promise.all([
            ajaxGet('/api/user/elements/can_manage_users,can_manage_events,is_exec').catch(() => null),
            ajaxGet('/api/user/elements/swims').catch(() => ({ swims: 0 })),
            updateBalanceInNav()
        ]);

        if (swimData && swimData.swims !== undefined) {
            profileButton.textContent = `Profile (${swimData.swims})`;
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
        // Logged out: Show login, hide profile, admin, and balance
        loginLi.classList.remove('hidden');
        profileLi.classList.add('hidden');
        if (balanceLi) balanceLi.classList.add('hidden');
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

    BalanceChangedEvent.subscribe(() => {
        updateBalanceInNav();
    });
    
    // Proactively update balance on every view change to ensure it is fresh
});

export { FirstNameChangedEvent, updateBalanceInNav };
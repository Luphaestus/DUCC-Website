/**
 * navbar.js
 * 
 * Manages the global navigation bar.
 * Handles dynamic rendering of navigation items based on authentication state,
 * active route highlighting, balance updates, and mobile menu logic.
 */

import { switchView, ViewChangedEvent } from '/js/utils/view.js';
import { ajaxGet } from '/js/utils/ajax.js';
import { Event } from '/js/utils/event.js';
import { LoginEvent } from '../pages/login.js';
import { BalanceChangedEvent } from '/js/utils/globals.js';

/**
 * Navigation configuration.
 * Groups: 'main' (left/center) and 'user' (right).
 * Action can be a function or a string (URL).
 */
const navEntries = [
    { name: '<img src="/images/misc/ducc.png" alt="DUCC Logo" class="nav-logo-img">', group: 'main', id: 'nav-home', type: 'text', classes: "contrast logo-link", action: { run: () => switchView('/home') } },
    { name: 'Events', group: 'main', type: 'text', classes: "contrast", action: { run: () => switchView('/events') } },
    { name: 'Files', group: 'main', type: 'text', classes: "contrast", action: { run: () => switchView('/files') } },
    { name: 'Swims', group: 'main', id: 'nav-swims', type: 'text', classes: "contrast", action: { run: () => switchView('/swims') } },
    
    { name: 'Admin', group: 'user', id: 'admin-button', type: 'text', classes: "contrast", action: { run: () => switchView('/admin/') } },
    { name: 'Balance: £0.00', group: 'user', id: 'balance-button', type: 'text', classes: "contrast", action: { run: () => switchView('/transactions') } },
    { name: 'Profile', group: 'user', id: 'profile-button', type: 'text', classes: "contrast", action: { run: () => switchView('/profile') } },
    { name: 'Login', group: 'user', id: 'login-button', type: 'text', classes: "contrast", action: { run: () => switchView('/login') } },
];

/** 
 * Fired when the user's first name is changed in the profile.
 * @type {Event} 
 */
const FirstNameChangedEvent = new Event();

/**
 * Fetches the current user's balance and updates the navbar display.
 * Applies conditional styling if balance is low or negative.
 */
async function updateBalanceInNav() {
    const balanceButton = document.getElementById('balance-button');
    if (balanceButton) {
        const data = await ajaxGet('/api/user/elements/balance').catch(() => null);
        if (data && data.balance !== undefined) {
            const balance = Number(data.balance);
            balanceButton.textContent = `Balance: £${balance.toFixed(2)}`;
            // Apply warning classes for low/negative balances
            balanceButton.classList.toggle('balance-low', balance < -20);
            balanceButton.classList.toggle('balance-warn', balance >= -20 && balance < -10);
        }
    }
}

/**
 * Updates the 'active' state of navbar items based on the current URL.
 * 
 * @param {string} path - The current application path.
 */
function updateActiveNav(path) {
    const navItems = document.querySelectorAll('.navbar-items li a, .navbar-items li button');
    navItems.forEach(item => {
        item.classList.remove('active');
        item.removeAttribute('aria-current');

        let match = false;
        // Check for matches based on known IDs or path prefixes
        if (item.id === 'nav-home' && (path === '/home' || path === '/')) match = true;
        else if (item.id === 'nav-events' && path.startsWith('/events')) match = true;
        else if (item.id === 'nav-files' && path.startsWith('/files')) match = true;
        else if (item.id === 'nav-swims' && path.startsWith('/swims')) match = true;
        else if (item.id === 'balance-button' && path.startsWith('/transactions')) match = true;
        else if (item.id === 'admin-button' && path.startsWith('/admin')) match = true;
        else if (item.id === 'login-button' && path.startsWith('/login')) match = true;
        else if (item.id === 'profile-button' && path.startsWith('/profile')) match = true;

        if (match) {
            item.classList.add('active');
            item.setAttribute('aria-current', 'page');
        }
    });
}

/**
 * Creates a DOM element for a navigation entry.
 * 
 * @param {object} entry - Navigation item configuration.
 * @returns {HTMLElement} - The list item element.
 */
function create_item(entry) {
    const li = document.createElement('li');
    let clicky;
    // Support either anchor or button elements
    switch (entry.type) {
        case 'button': clicky = document.createElement('button'); break;
        case 'text':
        default: clicky = document.createElement('a'); break;
    }

    if (entry.classes) clicky.className = entry.classes;
    clicky.id = entry.id || `nav-${entry.name.toLowerCase().replace(/[^a-z]/g, '')}`;
    clicky.innerHTML = entry.name;

    // Handle string URLs vs functional actions
    switch (typeof entry.action) {
        case 'string': clicky.href = entry.action; break;
        case 'object':
            clicky.href = '#';
            clicky.addEventListener('click', (e) => { 
                e.preventDefault();
                entry.action.run?.(); 
            });
            break;
    }

    li.appendChild(clicky);
    return li;
}

/**
 * Updates visibility of restricted navbar items based on current authentication and permissions.
 * 
 * @param {object} data - Auth status data from /api/auth/status.
 */
async function updateNavOnLoginState(data) {
    const isLoggedIn = data.authenticated;
    
    // Auth-only vs Guest-only items
    const authIds = ['profile-button', 'balance-button', 'nav-swims'];
    const guestIds = ['login-button'];

    authIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.parentElement.classList.toggle('hidden', !isLoggedIn);
    });

    guestIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.parentElement.classList.toggle('hidden', isLoggedIn);
    });

    if (isLoggedIn) {
        // Fetch detailed data for authenticated users
        const [userData, swimData] = await Promise.all([
            ajaxGet('/api/user/elements/permissions').catch(() => ({})),
            ajaxGet('/api/user/elements/swims').catch(() => ({ swims: 0 })),
            updateBalanceInNav()
        ]);

        const perms = userData.permissions || [];
        const profileButton = document.getElementById('profile-button');
        if (profileButton && swimData?.swims !== undefined) {
            profileButton.textContent = `Profile (${swimData.swims})`;
        }

        // Show admin button only if user has any administrative permissions
        const adminLi = document.getElementById('admin-button')?.parentElement;
        if (adminLi) {
            adminLi.classList.toggle('hidden', perms.length === 0);
        }
    } else {
        const adminLi = document.getElementById('admin-button')?.parentElement;
        if (adminLi) adminLi.classList.add('hidden');
    }
}

/** 
 * Closes or opens the mobile side-menu. 
 * Initialized in setupMobileMenu.
 */
let toggleMobileMenu = () => {};

/**
 * Initializes the mobile hamburger menu and overlay.
 */
function setupMobileMenu() {
    const nav = document.querySelector('nav.small-container');
    const mainList = document.querySelector('.navbar-items.main-items');

    if (!nav || !mainList) return;

    // Hamburger icon
    const li = document.createElement('li');
    li.className = 'hamburger-menu';

    const inner = document.createElement('span');
    inner.className = 'hamburger-inner';
    li.appendChild(inner);

    // Dimming overlay
    const overlay = document.createElement('div');
    overlay.id = 'mobile-menu-overlay';
    document.body.appendChild(overlay);

    toggleMobileMenu = (forceState) => {
        const isOpen = typeof forceState === 'boolean' ? !forceState : nav.classList.contains('mobile-open');
        const shouldOpen = !isOpen;

        if (shouldOpen) {
            nav.classList.add('mobile-open');
            document.body.classList.add('mobile-menu-open');
        } else {
            nav.classList.remove('mobile-open');
            document.body.classList.remove('mobile-menu-open');
        }
    };

    li.addEventListener('click', () => toggleMobileMenu());
    overlay.addEventListener('click', () => toggleMobileMenu(false));

    // Append hamburger icon to the start of the main list
    mainList.parentElement.prepend(li);
}

document.addEventListener('DOMContentLoaded', () => {
    const mainList = document.querySelector('.navbar-items.main-items');
    const userList = document.querySelector('.navbar-items.user-items');
    
    if (!mainList || !userList) return;

    // Populate navbar lists
    navEntries.forEach(entry => {
        const item = create_item(entry);
        if (entry.group === 'main') mainList.appendChild(item);
        else userList.appendChild(item);
    });

    setupMobileMenu();

    // Initial state setup
    ajaxGet('/api/auth/status', true).then(updateNavOnLoginState).catch(() => updateNavOnLoginState({ authenticated: false }));
    
    // Subscribe to state change events
    LoginEvent.subscribe(updateNavOnLoginState);
    BalanceChangedEvent.subscribe(updateBalanceInNav);

    ViewChangedEvent.subscribe(({ resolvedPath }) => {
        toggleMobileMenu(false); // Close mobile menu on navigation
        updateActiveNav(resolvedPath || window.location.pathname);
    });

    updateActiveNav(window.location.pathname);
});

export { FirstNameChangedEvent, updateBalanceInNav };
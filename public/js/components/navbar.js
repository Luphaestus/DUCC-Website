import { switchView, ViewChangedEvent } from '/js/utils/view.js';
import { ajaxGet } from '/js/utils/ajax.js';
import { Event } from '/js/utils/event.js';
import { LoginEvent } from '../pages/login.js';
import { BalanceChangedEvent } from '/js/utils/globals.js';

/**
 * Navigation configuration.
 */
const navEntries = [
    { name: 'Events', type: 'text', classes: "contrast", action: { run: () => switchView('/events') } },
    { name: 'Files', type: 'text', classes: "contrast", action: { run: () => switchView('/files') } },
    { name: 'Balance: £0.00', id: 'balance-button', type: 'text', classes: "contrast", action: { run: () => switchView('/transactions') } },
    { name: 'Admin', id: 'admin-button', type: 'text', classes: "contrast", action: { run: () => switchView('/admin/') } },
    { name: 'Login', id: 'login-button', type: 'text', classes: "contrast", action: { run: () => switchView('/login') } },
    { name: 'Profile', id: 'profile-button', type: 'text', classes: "contrast", action: { run: () => switchView('/profile') } }
];

// Fired on profile name change
const FirstNameChangedEvent = new Event();

/**
 * Fetch and update balance in navbar.
 */
async function updateBalanceInNav() {
    const balanceButton = document.getElementById('balance-button');
    if (balanceButton) {
        const data = await ajaxGet('/api/user/elements/balance').catch(() => null);
        if (data && data.balance !== undefined) {
            const balance = Number(data.balance);
            balanceButton.textContent = `Balance: £${balance.toFixed(2)}`;
            if (balance < -20) balanceButton.style.color = '#e74c3c';
            else if (balance < -10) balanceButton.style.color = '#f1c40f';
            else balanceButton.style.color = '';
        }
    }
}

/**
 * Update active navigation item.
 * @param {string} path 
 */
function updateActiveNav(path) {
    const navItems = document.querySelectorAll('.navbar-items li a, .navbar-items li button');
    navItems.forEach(item => {
        // Remove active state
        item.classList.remove('active');
        item.style.pointerEvents = '';
        item.style.cursor = 'pointer';
        item.removeAttribute('aria-current');

        // Check for match
        // We check if the click listener would call switchView with the current path
        // Since we can't easily inspect the listener, we rely on the ID or manual mapping
        // Or we can check if the item's text matches the path concept
        
        // Let's use the ID to map back to navEntries or just simple string matching if possible
        // But the navEntries don't store the path directly in a property accessible here easily
        // except in the closure of the click handler.
        
        // However, we know the IDs:
        // nav-events -> /events
        // nav-files -> /files
        // balance-button -> /transactions
        // admin-button -> /admin/
        // login-button -> /login
        // profile-button -> /profile

        let match = false;
        if (item.id === 'nav-events' && path.startsWith('/events')) match = true;
        else if (item.id === 'nav-files' && path.startsWith('/files')) match = true;
        else if (item.id === 'balance-button' && path.startsWith('/transactions')) match = true;
        else if (item.id === 'admin-button' && path.startsWith('/admin')) match = true;
        else if (item.id === 'login-button' && path.startsWith('/login')) match = true;
        else if (item.id === 'profile-button' && path.startsWith('/profile')) match = true;
        
        // Also handle 'Home' if it existed, but it's not in navEntries list above.

        if (match) {
            item.classList.add('active');
            item.style.pointerEvents = 'none';
            item.style.cursor = 'default';
            item.setAttribute('aria-current', 'page');
        }
    });
}

/**
 * Create navbar item element.
 * @param {object} entry
 * @returns {HTMLElement}
 */
function create_item(entry) {
    const li = document.createElement('li');
    let clicky;
    switch (entry.type) {
        case 'button': clicky = document.createElement('button'); break;
        case 'text':
        default: clicky = document.createElement('a'); break;
    }

    if (entry.classes) clicky.className = entry.classes;
    clicky.id = entry.id || `nav-${entry.name.toLowerCase().replace(/[^a-z]/g, '')}`;
    clicky.textContent = entry.name;

    switch (typeof entry.action) {
        case 'string': clicky.href = entry.action; break;
        case 'object':
            clicky.style.cursor = 'pointer';
            clicky.addEventListener('click', () => { entry.action.run?.(); });
            break;
    }

    li.appendChild(clicky);
    return li;
}

/**
 * Update navbar visibility based on login state.
 * @param {object} data
 */
async function updateNavOnLoginState(data) {
    const isLoggedIn = data.authenticated;
    const loginLi = document.getElementById('login-button')?.parentElement;
    const profileButton = document.getElementById('profile-button');
    const profileLi = profileButton?.parentElement;
    const balanceLi = document.getElementById('balance-button')?.parentElement;

    if (!profileButton) return;

    if (isLoggedIn) {
        loginLi?.classList.add('hidden');
        profileLi?.classList.remove('hidden');
        balanceLi?.classList.remove('hidden');

        const [userData, swimData] = await Promise.all([
            ajaxGet('/api/user/elements/permissions').catch(() => ({})),
            ajaxGet('/api/user/elements/swims').catch(() => ({ swims: 0 })),
            updateBalanceInNav()
        ]);

        const perms = userData.permissions || [];

        if (swimData?.swims !== undefined) profileButton.textContent = `Profile (${swimData.swims})`;

        const adminLi = document.getElementById('admin-button')?.parentElement;
        if (perms.length > 0) {
            adminLi?.classList.remove('hidden');
        } else adminLi?.classList.add('hidden');
    } else {
        loginLi?.classList.remove('hidden');
        profileLi?.classList.add('hidden');
        balanceLi?.classList.add('hidden');
        document.getElementById('admin-button')?.parentElement?.classList.add('hidden');
    }
}

// Global toggle menu function exposed for event listeners
let toggleMobileMenu = () => {};

/**
 * Setup mobile hamburger menu.
 */
function setupMobileMenu() {
    const nav = document.querySelector('nav.small-container');
    const firstUl = nav?.querySelector('ul:first-of-type');

    if (!nav || !firstUl) return;

    const li = document.createElement('li');
    li.className = 'hamburger-menu';

    const box = document.createElement('span');
    box.className = 'hamburger-box';
    const inner = document.createElement('span');
    inner.className = 'hamburger-inner';

    box.appendChild(inner);
    li.appendChild(box);

    // Create Overlay
    const overlay = document.createElement('div');
    overlay.id = 'mobile-menu-overlay';
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: '9', // Just below nav (10)
        display: 'none',
        backdropFilter: 'blur(4px)',
        webkitBackdropFilter: 'blur(4px)',
        cursor: 'pointer'
    });
    document.body.appendChild(overlay);

    toggleMobileMenu = (forceState) => {
        const isOpen = typeof forceState === 'boolean' ? !forceState : nav.classList.contains('mobile-open');
        const shouldOpen = !isOpen;

        if (shouldOpen) {
            nav.classList.add('mobile-open');
            overlay.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Disable scroll
        } else {
            nav.classList.remove('mobile-open');
            overlay.style.display = 'none';
            document.body.style.overflow = ''; // Enable scroll
        }
    };

    li.addEventListener('click', () => toggleMobileMenu());
    overlay.addEventListener('click', () => toggleMobileMenu(false));

    firstUl.appendChild(li);
}


document.addEventListener('DOMContentLoaded', () => {
    const navbarList = document.querySelector('.navbar-items');
    if (!navbarList) return;

    for (const entry of navEntries) navbarList.appendChild(create_item(entry));

    setupMobileMenu();

    ajaxGet('/api/auth/status').then(updateNavOnLoginState).catch(() => updateNavOnLoginState({ authenticated: false }));
    LoginEvent.subscribe(updateNavOnLoginState);
    BalanceChangedEvent.subscribe(updateBalanceInNav);

    // Close mobile menu on navigation
    ViewChangedEvent.subscribe(({ resolvedPath }) => {
        toggleMobileMenu(false);
        updateActiveNav(resolvedPath || window.location.pathname);
    });

    // Initial check
    updateActiveNav(window.location.pathname);
});

export { FirstNameChangedEvent, updateBalanceInNav };
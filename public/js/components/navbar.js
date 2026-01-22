import { switchView, ViewChangedEvent } from '/js/utils/view.js';
import { ajaxGet } from '/js/utils/ajax.js';
import { Event } from '/js/utils/event.js';
import { LoginEvent } from '../pages/login.js';
import { BalanceChangedEvent } from '/js/utils/globals.js';

/**
 * Navigation configuration.
 * Groups: 'main' (left/center) and 'user' (right)
 */
const navEntries = [
    { name: '<img src="/images/misc/ducc.png" alt="DUCC Logo" style="height: 1.8rem; width: auto;">', group: 'main', id: 'nav-home', type: 'text', classes: "contrast logo-link", action: { run: () => switchView('/home') } },
    { name: 'Events', group: 'main', type: 'text', classes: "contrast", action: { run: () => switchView('/events') } },
    { name: 'Files', group: 'main', type: 'text', classes: "contrast", action: { run: () => switchView('/files') } },
    { name: 'Swims', group: 'main', id: 'nav-swims', type: 'text', classes: "contrast", action: { run: () => switchView('/swims') } },
    
    { name: 'Admin', group: 'user', id: 'admin-button', type: 'text', classes: "contrast", action: { run: () => switchView('/admin/') } },
    { name: 'Balance: £0.00', group: 'user', id: 'balance-button', type: 'text', classes: "contrast", action: { run: () => switchView('/transactions') } },
    { name: 'Profile', group: 'user', id: 'profile-button', type: 'text', classes: "contrast", action: { run: () => switchView('/profile') } },
    { name: 'Login', group: 'user', id: 'login-button', type: 'text', classes: "contrast", action: { run: () => switchView('/login') } },
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
            if (balance < -20) balanceButton.style.color = '#ff6b6b';
            else if (balance < -10) balanceButton.style.color = '#feca57';
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
        item.classList.remove('active');
        item.style.pointerEvents = '';
        item.style.cursor = 'pointer';
        item.removeAttribute('aria-current');

        let match = false;
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
    clicky.innerHTML = entry.name;

    switch (typeof entry.action) {
        case 'string': clicky.href = entry.action; break;
        case 'object':
            clicky.style.cursor = 'pointer';
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
 * Update navbar visibility based on login state.
 * @param {object} data
 */
async function updateNavOnLoginState(data) {
    const isLoggedIn = data.authenticated;
    
    // Auth-only items
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

        const adminLi = document.getElementById('admin-button')?.parentElement;
        if (adminLi) {
            adminLi.classList.toggle('hidden', perms.length === 0);
        }
    } else {
        const adminLi = document.getElementById('admin-button')?.parentElement;
        if (adminLi) adminLi.classList.add('hidden');
    }
}

// Global toggle menu function exposed for event listeners
let toggleMobileMenu = () => {};

/**
 * Setup mobile hamburger menu.
 */
function setupMobileMenu() {
    const nav = document.querySelector('nav.small-container');
    const mainList = document.querySelector('.navbar-items.main-items');

    if (!nav || !mainList) return;

    const li = document.createElement('li');
    li.className = 'hamburger-menu';

    const inner = document.createElement('span');
    inner.className = 'hamburger-inner';
    li.appendChild(inner);

    const overlay = document.createElement('div');
    overlay.id = 'mobile-menu-overlay';
    document.body.appendChild(overlay);

    toggleMobileMenu = (forceState) => {
        const isOpen = typeof forceState === 'boolean' ? !forceState : nav.classList.contains('mobile-open');
        const shouldOpen = !isOpen;

        if (shouldOpen) {
            nav.classList.add('mobile-open');
            overlay.style.display = 'block';
            document.body.style.overflow = 'hidden';
        } else {
            nav.classList.remove('mobile-open');
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    };

    li.addEventListener('click', () => toggleMobileMenu());
    overlay.addEventListener('click', () => toggleMobileMenu(false));

    // Append to the start of the main list for mobile visibility
    mainList.parentElement.prepend(li);
}


document.addEventListener('DOMContentLoaded', () => {
    const mainList = document.querySelector('.navbar-items.main-items');
    const userList = document.querySelector('.navbar-items.user-items');
    
    if (!mainList || !userList) return;

    navEntries.forEach(entry => {
        const item = create_item(entry);
        if (entry.group === 'main') mainList.appendChild(item);
        else userList.appendChild(item);
    });

    setupMobileMenu();

    ajaxGet('/api/auth/status').then(updateNavOnLoginState).catch(() => updateNavOnLoginState({ authenticated: false }));
    LoginEvent.subscribe(updateNavOnLoginState);
    BalanceChangedEvent.subscribe(updateBalanceInNav);

    ViewChangedEvent.subscribe(({ resolvedPath }) => {
        toggleMobileMenu(false);
        updateActiveNav(resolvedPath || window.location.pathname);
    });

    updateActiveNav(window.location.pathname);
});

export { FirstNameChangedEvent, updateBalanceInNav };

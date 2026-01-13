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
    { name: 'Balance: £0.00', id: 'balance-button', type: 'text', classes: "contrast", action: { run: () => switchView('/transactions') } },
    { name: 'Admin', id: 'admin-button', type: 'text', classes: "contrast", action: { run: () => switchView('/admin/') } },
    { name: 'Login', id: 'login-button', type: 'button', action: { run: () => switchView('/login') } },
    { name: 'Profile', id: 'profile-button', type: 'button', action: { run: () => switchView('/profile') } }
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

        const [permissions, swimData] = await Promise.all([
            ajaxGet('/api/user/elements/can_manage_users,can_manage_events,is_exec').catch(() => null),
            ajaxGet('/api/user/elements/swims').catch(() => ({ swims: 0 })),
            updateBalanceInNav()
        ]);

        if (swimData?.swims !== undefined) profileButton.textContent = `Profile (${swimData.swims})`;

        const adminLi = document.getElementById('admin-button')?.parentElement;
        if (permissions && (permissions.can_manage_users || permissions.can_manage_events || permissions.is_exec)) {
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
            // Ensure nav is visible when opening menu
            nav.classList.remove('nav-hidden');
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

/**
 * Setup scroll-to-hide navbar behavior.
 */
function setupScrollHide() {
    const nav = document.querySelector('nav.small-container');
    if (!nav) return;

    // Create a placeholder to prevent content jumping when nav becomes absolute
    const placeholder = document.createElement('div');
    placeholder.style.display = 'none';
    placeholder.style.width = '100%';
    nav.parentElement.insertBefore(placeholder, nav);

    let lastScrollY = window.scrollY;
    let defaultHeight = nav.offsetHeight || 64; // Fallback to 64px

    // Update default height on resize
    window.addEventListener('resize', () => {
        if (!nav.classList.contains('mobile-open')) {
             defaultHeight = nav.offsetHeight || 64;
        }
    });

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        
        // If menu is open, we disabled scrolling on body, so this might not fire much,
        // but if it does, we shouldn't hide the navbar.
        if (nav.classList.contains('mobile-open')) return;

        // Update default height if we are in a stable state
        if (nav.style.position !== 'absolute') {
             defaultHeight = nav.offsetHeight || 64;
        }

        // Don't hide if at the very top (e.g. bouncing scroll)
        if (currentScrollY <= 0) {
            nav.classList.remove('nav-hidden');
            nav.style.position = '';
            nav.style.top = '';
            placeholder.style.display = 'none';
            lastScrollY = currentScrollY;
            return;
        }

        if (currentScrollY > lastScrollY) {
            // Scrolling down
            if (nav.style.position !== 'absolute') {
                // Set placeholder height before switching to absolute
                placeholder.style.height = `${nav.offsetHeight}px`;
                placeholder.style.display = 'block';

                nav.style.position = 'absolute';
                nav.style.top = `${currentScrollY}px`;
            }

            // Mark as hidden if fully out of screen
            const rect = nav.getBoundingClientRect();
            // Use defaultHeight to avoid issues if height changes dynamically or is 0
            const threshold = defaultHeight > 0 ? defaultHeight : 64;

            if (rect.top + threshold <= 0) {
                nav.classList.add('nav-hidden');
            }
        } else {
            // Scrolling up
            const isHidden = nav.classList.contains('nav-hidden');
            const isAbsolute = nav.style.position === 'absolute';

            if (isHidden || isAbsolute) {
                // If it was hidden or absolute, reset to sticky and animate in
                nav.style.position = '';
                nav.style.top = '';
                placeholder.style.display = 'none';

                // Ensure hidden class is present before removing to trigger transition if needed
                // But removing it is enough to show it.
                nav.classList.remove('nav-hidden');
            }
        }

        lastScrollY = currentScrollY;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const navbarList = document.querySelector('.navbar-items');
    if (!navbarList) return;

    for (const entry of navEntries) navbarList.appendChild(create_item(entry));

    setupMobileMenu();
    setupScrollHide();

    ajaxGet('/api/auth/status').then(updateNavOnLoginState).catch(() => updateNavOnLoginState({ authenticated: false }));
    LoginEvent.subscribe(updateNavOnLoginState);
    BalanceChangedEvent.subscribe(updateBalanceInNav);

    // Close mobile menu on navigation
    ViewChangedEvent.subscribe(() => {
        toggleMobileMenu(false);
    });
});

export { FirstNameChangedEvent, updateBalanceInNav };
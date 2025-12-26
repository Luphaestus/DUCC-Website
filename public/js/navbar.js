import { switchView, ViewChangedEvent } from './misc/view.js';
import { ajaxGet } from './misc/ajax.js';
import { Event } from './misc/event.js';
import { LoginEvent } from './login.js';
import { BalanceChangedEvent } from './misc/globals.js';

/**
 * Navigation configuration.
 */
const navEntries = [
    { name: 'Events', type: 'text', classes: "contrast", action: { run: () => switchView('/events') } },
    { name: 'Admin', id: 'admin-button', type: 'text', classes: "contrast", action: { run: () => switchView('/admin/') } },
    { name: 'Balance: £0.00', id: 'balance-button', type: 'text', classes: "contrast", action: { run: () => switchView('/transactions') } },
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

document.addEventListener('DOMContentLoaded', () => {
    const navbarList = document.querySelector('.navbar-items');
    if (!navbarList) return;

    for (const entry of navEntries) navbarList.appendChild(create_item(entry));

    ajaxGet('/api/auth/status').then(updateNavOnLoginState).catch(() => updateNavOnLoginState({ authenticated: false }));
    LoginEvent.subscribe(updateNavOnLoginState);
    BalanceChangedEvent.subscribe(updateBalanceInNav);
});

export { FirstNameChangedEvent, updateBalanceInNav };
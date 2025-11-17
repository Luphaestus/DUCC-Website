import { switchView } from './misc/view.js';
import { ajaxGet } from './misc/ajax.js';


const navEntries = [
    { name: 'Home', type: 'text', contrast: true, action: { run: () => switchView('home') } },
    { name: 'Events', type: 'text', contrast: true, action: { run: () => switchView('events') } },
    {
        name: 'Login', type: 'button', contrast: false, action: {
            run: () => {
                ajaxGet('/api/user/loggedin', (data) => {
                    if (data.loggedIn) {
                        switchView('settings');
                    } else {
                        switchView('login');
                    }
                },
                    () => {
                        switchView('login');
                    });
            }
        }
    }
]

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

    if (entry.contrast) clicky.className = 'contrast';
    clicky.id = `nav-${entry.name.toLowerCase()}`;
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

function setup_login_button() {
    const loginButton = document.getElementById('nav-login');
    if (!loginButton) return;

    ajaxGet('/api/user/fname', (data) => {
        const firstName = data.firstName;
        loginButton.textContent = `Hello, ${firstName}`;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const navbarList = document.querySelector('.navbar-items');
    if (!navbarList) return;

    for (const entry of navEntries) {
        navbarList.appendChild(create_item(entry));
    }

    setup_login_button();
});

export { setup_login_button };
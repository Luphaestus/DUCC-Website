const navEntries = [
    { name: 'Home',     type: 'text',   contrast: true,  action: '/' },
    { name: 'Projects', type: 'text',   contrast: true,  action: '/projects' },
    { name: 'Sign In',  type: 'button', contrast: false, action: {} }
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
    clicky.textContent = entry.name;
    
    if (typeof(entry.action) === 'string') clicky.href = entry.action;

    li.appendChild(clicky);
    return li;
}

document.addEventListener('DOMContentLoaded', () => {
    const navbarList = document.querySelector('.navbar-items');
    if (!navbarList) return;

    for (const entry of navEntries) {
        navbarList.appendChild(create_item(entry));
    }
});
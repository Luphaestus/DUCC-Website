import { LoginEvent } from './login.js'
import { ajaxGet } from './misc/ajax.js';

function notAuthenticated() {
    const profileInfoDiv = document.getElementById('profile-info');
    const editProfileButton = document.getElementById('edit-profile-button');

    profileInfoDiv.innerHTML = `
        <p>You are not logged in. Please <a href="/login" id="profile-login-link">log in</a> to view your profile.</p>
    `;

    const loginLink = document.getElementById('profile-login-link');
    loginLink.addEventListener('click', () => {
        switchView('/login');
    });

    editProfileButton.style.display = 'none';
}


async function updateProfilePage() {
    const profileInfoDiv = document.getElementById('profile-info');
    const editProfileButton = document.getElementById('edit-profile-button');

    const profile = await ajaxGet('/api/user/profile').catch(() => notAuthenticated());

    if (profile) {
        profileInfoDiv.innerHTML = `
            <h2>${profile.first_name} ${profile.last_name}</h2>
            <p><strong>Email:</strong> ${profile.email}</p>
            <button id="profile-logout-button">Log Out</button>
        `;

        if (profile.can_manage_users) {
            console.log("User has admin privileges.");

        }


        const logoutButton = document.getElementById('profile-logout-button');
        logoutButton.addEventListener('click', async () => {
            await ajaxGet('/api/logout');
            LoginEvent.notify({ loggedIn: false });
            switchView('/home');
        });

    } else {
        notAuthenticated();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateProfilePage();

    LoginEvent.subscribe((data) => {
        updateProfilePage(data);
    });
});
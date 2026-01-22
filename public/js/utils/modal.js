/**
 * modal.js
 * 
 * Provides utility functions for displaying custom glassmorphic modals.
 * Supports standard confirmations, password entry for sensitive actions,
 * and change-password dialogs.
 */

/**
 * Displays a custom confirmation modal with "Confirm" and "Cancel" buttons.
 * 
 * @param {string} title - Modal heading.
 * @param {string} message - Modal body text (supports HTML).
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false otherwise.
 */
export function showConfirmModal(title, message) {
    return new Promise((resolve) => {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'custom-modal-overlay';

        modalOverlay.innerHTML = /*html*/`
            <div class="custom-modal-content">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="modal-actions">
                    <button class="btn-cancel" id="confirm-cancel">Cancel</button>
                    <button class="btn-confirm" id="confirm-ok">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);
        // Force reflow for transition
        requestAnimationFrame(() => modalOverlay.classList.add('visible'));

        const cleanup = (val) => {
            modalOverlay.classList.remove('visible');
            setTimeout(() => {
                if (document.body.contains(modalOverlay)) document.body.removeChild(modalOverlay);
                resolve(val);
            }, 300);
        };

        modalOverlay.querySelector('#confirm-ok').onclick = () => cleanup(true);
        modalOverlay.querySelector('#confirm-cancel').onclick = () => cleanup(false);
        modalOverlay.onclick = (e) => { if (e.target === modalOverlay) cleanup(false); };
    });
}

/**
 * Displays a password entry modal for confirming high-security actions.
 * 
 * @param {string} title - Heading.
 * @param {string} message - Instruction text.
 * @returns {Promise<string|null>} - Resolves with the password if confirmed, or null if cancelled.
 */
export function showPasswordModal(title, message) {
    return new Promise((resolve) => {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'custom-modal-overlay';

        modalOverlay.innerHTML = /*html*/`
            <div class="custom-modal-content">
                <h3>${title}</h3>
                <p>${message}</p>
                <input type="password" id="confirm-password" placeholder="Enter your password">
                <div class="modal-actions">
                    <button class="btn-cancel" id="confirm-cancel">Cancel</button>
                    <button class="btn-confirm" id="confirm-ok">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);
        requestAnimationFrame(() => modalOverlay.classList.add('visible'));

        const input = modalOverlay.querySelector('#confirm-password');
        input.focus();

        const cleanup = (val) => {
            modalOverlay.classList.remove('visible');
            setTimeout(() => {
                if (document.body.contains(modalOverlay)) document.body.removeChild(modalOverlay);
                resolve(val);
            }, 300);
        };

        const confirm = () => {
            const password = input.value;
            if (password) cleanup(password);
        };

        modalOverlay.querySelector('#confirm-ok').onclick = confirm;
        modalOverlay.querySelector('#confirm-cancel').onclick = () => cleanup(null);
        modalOverlay.onclick = (e) => { if (e.target === modalOverlay) cleanup(false); };
        input.onkeydown = (e) => { if (e.key === 'Enter') confirm(); };
    });
}

/**
 * Displays a modal specifically designed for changing a user's password.
 * 
 * @returns {Promise<{currentPassword: string, newPassword: string}|null>}
 */
export function showChangePasswordModal() {
    return new Promise((resolve) => {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'custom-modal-overlay';

        modalOverlay.innerHTML = /*html*/`
            <div class="custom-modal-content">
                <h3>Change Password</h3>
                <p>Please enter your current password and a new password.</p>
                <input type="password" id="current-password" placeholder="Current Password">
                <input type="password" id="new-password" placeholder="New Password">
                <div class="modal-actions">
                    <button class="btn-cancel" id="confirm-cancel">Cancel</button>
                    <button class="btn-confirm" id="confirm-ok">Change Password</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);
        requestAnimationFrame(() => modalOverlay.classList.add('visible'));

        const currentInput = modalOverlay.querySelector('#current-password');
        const newInput = modalOverlay.querySelector('#new-password');
        currentInput.focus();

        const cleanup = (val) => {
            modalOverlay.classList.remove('visible');
            setTimeout(() => {
                if (document.body.contains(modalOverlay)) document.body.removeChild(modalOverlay);
                resolve(val);
            }, 300);
        };

        const confirm = () => {
            const currentPassword = currentInput.value;
            const newPassword = newInput.value;
            if (currentPassword && newPassword) cleanup({ currentPassword, newPassword });
        };

        modalOverlay.querySelector('#confirm-ok').onclick = confirm;
        modalOverlay.querySelector('#confirm-cancel').onclick = () => cleanup(null);
        modalOverlay.onclick = (e) => { if (e.target === modalOverlay) cleanup(false); };
        newInput.onkeydown = (e) => { if (e.key === 'Enter') confirm(); };
    });
}
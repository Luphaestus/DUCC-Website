/**
 * modal.js
 * 
 * Provides utility functions for displaying custom glassmorphic modals.
 */

import { Modal } from '@/widgets/Modal';

interface MountResult {
    element: HTMLElement;
    cleanup: () => void;
}

/**
 * Helper to mount and show a modal, returning a cleanup function.
 */
function mountModal(modal: Modal): MountResult {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = modal.getHTML();
    const modalEl = wrapper.firstElementChild as HTMLElement;
    document.body.appendChild(modalEl);

    modal.attachListeners();
    modal.show();

    return {
        element: modalEl,
        cleanup: () => {
            modal.hide();
            setTimeout(() => {
                if (document.body.contains(modalEl)) document.body.removeChild(modalEl);
            }, 300);
        }
    };
}

/**
 * Displays a custom confirmation modal with "Confirm" and "Cancel" buttons.
 */
export function showConfirmModal(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
        const modal = new Modal({
            id: `confirm-modal-${Date.now()}`,
            title: title,
            content: `
                <p>${message}</p>
                <div class="modal-actions">
                    <button class="btn-cancel" id="confirm-cancel">Cancel</button>
                    <button class="btn-confirm" id="confirm-ok">Confirm</button>
                </div>
            `,
            onClose: () => {
                mount.cleanup();
                resolve(false);
            }
        });

        const mount = mountModal(modal);

        (mount.element.querySelector('#confirm-ok') as HTMLElement).onclick = () => {
            mount.cleanup();
            resolve(true);
        };

        (mount.element.querySelector('#confirm-cancel') as HTMLElement).onclick = () => {
            mount.cleanup();
            resolve(false);
        };
    });
}

/**
 * Displays a password entry modal for confirming high-security actions.
 */
export function showPasswordModal(title: string, message: string): Promise<string | null> {
    return new Promise((resolve) => {
        const modal = new Modal({
            id: `password-modal-${Date.now()}`,
            title: title,
            content: `
                <p>${message}</p>
                <input type="password" id="confirm-password" placeholder="Enter your password">
                <div class="modal-actions">
                    <button class="btn-cancel" id="confirm-cancel">Cancel</button>
                    <button class="btn-confirm" id="confirm-ok">Confirm</button>
                </div>
            `,
            onClose: () => {
                mount.cleanup();
                resolve(null);
            }
        });

        const mount = mountModal(modal);
        const input = mount.element.querySelector('#confirm-password') as HTMLInputElement;
        input.focus();

        const confirm = () => {
            const password = input.value;
            if (password) {
                mount.cleanup();
                resolve(password);
            }
        };

        (mount.element.querySelector('#confirm-ok') as HTMLElement).onclick = confirm;
        (mount.element.querySelector('#confirm-cancel') as HTMLElement).onclick = () => {
            mount.cleanup();
            resolve(null);
        };
        input.onkeydown = (e: KeyboardEvent) => { if (e.key === 'Enter') confirm(); };
    });
}

/**
 * Displays a modal specifically designed for changing a user's password.
 */
export function showChangePasswordModal(): Promise<{ currentPassword: string; newPassword: string } | null> {
    return new Promise((resolve) => {
        const modal = new Modal({
            id: `change-pw-modal-${Date.now()}`,
            title: 'Change Password',
            content: `
                <p>Please enter your current password and a new password.</p>
                <input type="password" id="current-password" placeholder="Current Password">
                <input type="password" id="new-password" placeholder="New Password">
                <div class="modal-actions">
                    <button class="btn-cancel" id="confirm-cancel">Cancel</button>
                    <button class="btn-confirm" id="confirm-ok">Change Password</button>
                </div>
            `,
            onClose: () => {
                mount.cleanup();
                resolve(null);
            }
        });

        const mount = mountModal(modal);

        const currentInput = mount.element.querySelector('#current-password') as HTMLInputElement;
        const newInput = mount.element.querySelector('#new-password') as HTMLInputElement;
        currentInput.focus();

        const confirm = () => {
            const currentPassword = currentInput.value;
            const newPassword = newInput.value;
            if (currentPassword && newPassword) {
                mount.cleanup();
                resolve({ currentPassword, newPassword });
            }
        };

        (mount.element.querySelector('#confirm-ok') as HTMLElement).onclick = confirm;
        (mount.element.querySelector('#confirm-cancel') as HTMLElement).onclick = () => {
            mount.cleanup();
            resolve(null);
        };
        newInput.onkeydown = (e: KeyboardEvent) => { if (e.key === 'Enter') confirm(); };
    });
}
import { render } from "solid-js/web";
import { createSignal, JSX } from "solid-js";
import Modal from "@/components/Modal";
import { GlassButtonSmall } from "@/components/LiquidButton";

/**
 * Utility to show a confirmation modal.
 */
export function showConfirmModal(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
        const mount = document.createElement('div');
        document.body.appendChild(mount);

        const [isOpen, setIsOpen] = createSignal(true);

        const close = (result: boolean) => {
            setIsOpen(false);
            setTimeout(() => {
                unmount();
                resolve(result);
            }, 400); // Allow time for exit animation
        };

        const unmount = render(() => (
            <Modal 
                title={title} 
                isOpen={isOpen()} 
                onClose={() => close(false)}
                footer={
                    <>
                        <GlassButtonSmall class="btn-cancel secondary outline" onClick={() => close(false)}>Cancel</GlassButtonSmall>
                        <GlassButtonSmall class="btn-confirm primary" onClick={() => close(true)}>Confirm</GlassButtonSmall>
                    </>
                }
            >
                <p>{message}</p>
            </Modal>
        ), mount);
    });
}

/**
 * Utility to show a password entry modal.
 */
export function showPasswordModal(title: string, message: string): Promise<string | null> {
    return new Promise((resolve) => {
        const mount = document.createElement('div');
        document.body.appendChild(mount);

        const [isOpen, setIsOpen] = createSignal(true);
        const [password, setPassword] = createSignal("");

        const close = (result: string | null) => {
            setIsOpen(false);
            setTimeout(() => {
                unmount();
                resolve(result);
            }, 400);
        };

        const unmount = render(() => (
            <Modal 
                title={title} 
                isOpen={isOpen()} 
                onClose={() => close(null)}
                footer={
                    <>
                        <GlassButtonSmall class="btn-cancel secondary outline" onClick={() => close(null)}>Cancel</GlassButtonSmall>
                        <GlassButtonSmall class="btn-confirm primary" onClick={() => close(password())}>Confirm</GlassButtonSmall>
                    </>
                }
            >
                <p>{message}</p>
                <input 
                    type="password" 
                    class="modern-input" 
                    placeholder="Enter your password" 
                    value={password()}
                    onInput={e => setPassword(e.currentTarget.value)}
                    onKeyDown={e => e.key === 'Enter' && close(password())}
                    autofocus
                />
            </Modal>
        ), mount);
    });
}

/**
 * Utility to show a change password modal.
 */
export function showChangePasswordModal(): Promise<{ currentPassword: string; newPassword: string } | null> {
    return new Promise((resolve) => {
        const mount = document.createElement('div');
        document.body.appendChild(mount);

        const [isOpen, setIsOpen] = createSignal(true);
        const [currentPassword, setCurrentPassword] = createSignal("");
        const [newPassword, setNewPassword] = createSignal("");

        const close = (result: any) => {
            setIsOpen(false);
            setTimeout(() => {
                unmount();
                resolve(result);
            }, 400);
        };

        const unmount = render(() => (
            <Modal 
                title="Change Password" 
                isOpen={isOpen()} 
                onClose={() => close(null)}
                footer={
                    <>
                        <GlassButtonSmall class="btn-cancel secondary outline" onClick={() => close(null)}>Cancel</GlassButtonSmall>
                        <GlassButtonSmall class="btn-confirm primary" onClick={() => close({ currentPassword: currentPassword(), newPassword: newPassword() })}>Change Password</GlassButtonSmall>
                    </>
                }
            >
                <p>Please enter your current password and a new password.</p>
                <div class="modern-form">
                    <label>Current Password
                        <input type="password" value={currentPassword()} onInput={e => setCurrentPassword(e.currentTarget.value)} autofocus />
                    </label>
                    <label>New Password
                        <input type="password" value={newPassword()} onInput={e => setNewPassword(e.currentTarget.value)} />
                    </label>
                </div>
            </Modal>
        ), mount);
    });
}
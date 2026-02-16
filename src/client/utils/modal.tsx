import { render } from "solid-js/web";
import { createSignal, JSX } from "solid-js";
import Modal from "@/components/Modal";
import { GlassButtonSmall } from "@/components/LiquidButton";
import { apiRequest } from "@/utils/api";

let activeModalPromise: Promise<any> | null = null;

/**
 * Utility to show an alert modal.
 */
export async function showAlertModal(title: string, message: string): Promise<void> {
    if (activeModalPromise) await activeModalPromise;

    activeModalPromise = new Promise((resolve) => {
        const mount = document.createElement('div');
        document.body.appendChild(mount);

        const [isOpen, setIsOpen] = createSignal(true);

        const close = () => {
            setIsOpen(false);
            setTimeout(() => {
                unmount();
                mount.remove();
                activeModalPromise = null;
                resolve(void 0);
            }, 400);
        };

        const unmount = render(() => (
            <Modal 
                title={title} 
                isOpen={isOpen()} 
                onClose={close}
                footer={
                    <div class="btn-group full-width">
                        <GlassButtonSmall 
                            class="btn-confirm primary full-width" 
                            borderRadius={16} 
                            tintOpacity={0.2} 
                            onClick={close}
                        >
                            OK
                        </GlassButtonSmall>
                    </div>
                }
            >
                <p innerHTML={message}></p>
            </Modal>
        ), mount);
    });

    return activeModalPromise;
}

/**
 * Utility to show a confirmation modal.
 */
export async function showConfirmModal(title: string, message: string): Promise<boolean> {
    if (activeModalPromise) await activeModalPromise;

    activeModalPromise = new Promise((resolve) => {
        const mount = document.createElement('div');
        document.body.appendChild(mount);

        const [isOpen, setIsOpen] = createSignal(true);

        const close = (result: boolean) => {
            setIsOpen(false);
            setTimeout(() => {
                unmount();
                mount.remove();
                activeModalPromise = null;
                resolve(result);
            }, 400); // Allow time for exit animation
        };

        const unmount = render(() => (
            <Modal 
                title={title} 
                isOpen={isOpen()} 
                onClose={() => close(false)}
                footer={
                    <div class="btn-group full-width" style={{ gap: '1rem', display: 'flex' }}>
                        <GlassButtonSmall 
                            class="btn-cancel secondary" 
                            style={{ flex: 1 }}
                            borderRadius={16} 
                            tintOpacity={0.1} 
                            onClick={() => close(false)}
                        >
                            Cancel
                        </GlassButtonSmall>
                        <GlassButtonSmall 
                            class="btn-confirm primary" 
                            style={{ flex: 1 }}
                            borderRadius={16} 
                            tintOpacity={0.2} 
                            onClick={() => close(true)}
                        >
                            Confirm
                        </GlassButtonSmall>
                    </div>
                }
            >
                <p innerHTML={message}></p>
            </Modal>
        ), mount);
    });

    return activeModalPromise;
}

/**
 * Utility to show a password entry modal.
 */
export async function showPasswordModal(title: string, message: string): Promise<string | null> {
    if (activeModalPromise) await activeModalPromise;

    activeModalPromise = new Promise((resolve) => {
        const mount = document.createElement('div');
        document.body.appendChild(mount);

        const [isOpen, setIsOpen] = createSignal(true);
        const [password, setPassword] = createSignal("");

        const close = (result: string | null) => {
            setIsOpen(false);
            setTimeout(() => {
                unmount();
                mount.remove();
                activeModalPromise = null;
                resolve(result);
            }, 400);
        };

        const unmount = render(() => (
            <Modal 
                title={title} 
                isOpen={isOpen()} 
                onClose={() => close(null)}
                footer={
                    <div class="btn-group full-width" style={{ gap: '1rem', display: 'flex' }}>
                        <GlassButtonSmall 
                            class="btn-cancel secondary" 
                            style={{ flex: 1 }}
                            borderRadius={16} 
                            tintOpacity={0.1} 
                            onClick={() => close(null)}
                        >
                            Cancel
                        </GlassButtonSmall>
                        <GlassButtonSmall 
                            class="btn-confirm primary" 
                            style={{ flex: 1 }}
                            borderRadius={16} 
                            tintOpacity={0.2} 
                            onClick={() => close(password())}
                        >
                            Confirm
                        </GlassButtonSmall>
                    </div>
                }
            >
                <p innerHTML={message}></p>
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

    return activeModalPromise;
}

/**
 * Utility to show a change password modal.
 */
export async function showChangePasswordModal(userEmail?: string): Promise<{ currentPassword: string; newPassword: string } | null> {
    if (activeModalPromise) await activeModalPromise;

    activeModalPromise = new Promise((resolve) => {
        const mount = document.createElement('div');
        document.body.appendChild(mount);

        const [isOpen, setIsOpen] = createSignal(true);
        const [currentPassword, setCurrentPassword] = createSignal("");
        const [newPassword, setNewPassword] = createSignal("");
        const [isResetting, setIsResetting] = createSignal(false);

        const close = (result: any) => {
            setIsOpen(false);
            setTimeout(() => {
                unmount();
                mount.remove();
                activeModalPromise = null;
                resolve(result);
            }, 400);
        };

        const handleForgot = async () => {
            if (!userEmail) return;
            setIsResetting(true);
            try {
                await apiRequest('POST', '/api/auth/reset-password-request', { email: userEmail });
                await showAlertModal('Reset Sent', 'A password reset link has been sent to your email.');
                close(null);
            } catch (e: any) {
                await showAlertModal('Error', 'Failed to send reset link: ' + e.message);
            } finally {
                setIsResetting(false);
            }
        };

        const unmount = render(() => (
            <Modal 
                title="Change Password" 
                isOpen={isOpen()} 
                onClose={() => close(null)}
                footer={
                    <div class="btn-group full-width" style={{ gap: '1rem', display: 'flex' }}>
                        <GlassButtonSmall 
                            class="btn-cancel secondary" 
                            style={{ flex: 1 }}
                            borderRadius={16} 
                            tintOpacity={0.1} 
                            onClick={() => close(null)}
                        >
                            Cancel
                        </GlassButtonSmall>
                        <GlassButtonSmall 
                            class="btn-confirm primary" 
                            style={{ flex: 1 }}
                            borderRadius={16} 
                            tintOpacity={0.2} 
                            onClick={() => close({ currentPassword: currentPassword(), newPassword: newPassword() })}
                        >
                            Change Password
                        </GlassButtonSmall>
                    </div>
                }
            >
                <p>Please enter your current password and a new password.</p>
                <div class="modern-form">
                    <label>Current Password
                        <input type="password" value={currentPassword()} onInput={e => setCurrentPassword(e.currentTarget.value)} autofocus />
                    </label>
                    <div style={{ "text-align": "right", "margin-top": "-0.5rem", "margin-bottom": "1rem" }}>
                        <a href="javascript:void(0)" class="small-text underline" onClick={handleForgot} style={{ opacity: isResetting() ? 0.5 : 1 }}>
                            {isResetting() ? 'Sending...' : 'Forgot Password?'}
                        </a>
                    </div>
                    <label>New Password
                        <input type="password" value={newPassword()} onInput={e => setNewPassword(e.currentTarget.value)} />
                    </label>
                </div>
            </Modal>
        ), mount);
    });

    return activeModalPromise;
}
import { createSignal, createResource, Show, For } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import Modal from "@/components/Modal";
import Panel from "@/components/Panel";
import {
    FaSolidXmark, FaSolidKey, FaSolidPlus, FaSolidCopy, FaSolidDownload, FaSolidBolt, FaSolidCalendarDays
} from 'solid-icons/fa';
import { showConfirmModal, showPasswordModal, showChangePasswordModal } from "@/utils/modal";
import * as SimpleWebAuthnBrowser from '@simplewebauthn/browser';
import { isPWAInstalled, installPWA, isManualInstall, deferredPrompt, isSubscribed, subscribeToNotifications, unsubscribeFromNotifications } from "@/utils/pwa";
import { LoginEvent } from "@/utils/events/events";
import { useProfile } from "./ProfileLayout";

export default function ProfileSettings() {
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const context = useProfile();
    const profile = () => context?.profile();
    const refetch = () => context?.refetch();

    const [isSubscribing, setIsSubscribing] = createSignal(false);
    const [isUnsubscribing, setIsUnsubscribing] = createSignal(false);

    const handleSubscribe = async () => {
        setIsSubscribing(true);
        const success = await subscribeToNotifications();
        setIsSubscribing(false);
        if (success) {
            notify('Success', 'You are now subscribed to push notifications!', 'success');
        } else {
            notify('Error', 'Failed to subscribe. Please check browser permissions.', 'error');
        }
    };

    const handleUnsubscribe = async () => {
        setIsUnsubscribing(true);
        const success = await unsubscribeFromNotifications();
        setIsUnsubscribing(false);
        if (success) {
            notify('Success', 'You have unsubscribed from push notifications.', 'success');
        } else {
            notify('Error', 'Failed to unsubscribe.', 'error');
        }
    };

    // 2FA Management
    const [isTOTPModalOpen, setIsTOTPModalOpen] = createSignal(false);
    const [totpSetup, setTOTPSetup] = createSignal<{ qrCodeData: string; secret: string } | null>(null);
    const handleSetupTOTP = async () => {
        notify('Info', 'Preparing TOTP setup...', 'info', 5000, 'totp-setup');
        try {
            const data = await apiRequest('GET', '/api/auth/totp/setup');
            setTOTPSetup(data);
            setIsTOTPModalOpen(true);
            notify('Success', 'TOTP setup ready.', 'success', 3000, 'totp-setup');
        } catch (err) {
            notify('Error', 'Failed to start setup.', 'error', 5000, 'totp-setup');
        }
    };

    const handleVerifyTOTP = async (e: Event) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const token = formData.get('totp-code') as string;

        if (!token) {
            notify('Error', 'Please enter the verification code.', 'error');
            return;
        }

        notify('Info', 'Verifying code...', 'info', 5000, 'totp-verify');
        try {
            await apiRequest('POST', '/api/auth/totp/enable', { token });
            notify('Success', 'TOTP enabled!', 'success', 3000, 'totp-verify');
            setIsTOTPModalOpen(false);
            refetch();
        } catch (err: any) {
            notify('Error', err.message, 'error', 5000, 'totp-verify');
        }
    };

    const handleDisableTOTP = async () => {
        if (await showConfirmModal('Disable 2FA?', 'Are you sure? This will make your account less secure.')) {
            notify('Info', 'Disabling TOTP...', 'info', 5000, 'totp-disable');
            try {
                await apiRequest('POST', '/api/auth/totp/disable');
                notify('Success', 'TOTP disabled.', 'success', 3000, 'totp-disable');
                refetch();
            } catch (err: any) {
                notify('Error', err.message, 'error', 5000, 'totp-disable');
            }
        }
    };

    const handleToggleEmail2FA = async () => {
        const currentlyEnabled = profile()?.email_2fa_enabled;
        const action = currentlyEnabled ? 'disable' : 'enable';

        if (currentlyEnabled) {
            if (!(await showConfirmModal('Disable Email 2FA?', 'Are you sure? This will make your account less secure.'))) return;
        }

        notify('Info', `${currentlyEnabled ? 'Disabling' : 'Enabling'} Email 2FA...`, 'info', 5000, 'email-2fa-toggle');
        try {
            await apiRequest('POST', `/api/auth/email-2fa/${action}`);
            notify('Success', `Email 2FA ${currentlyEnabled ? 'disabled' : 'enabled'}.`, 'success', 3000, 'email-2fa-toggle');
            refetch();
        } catch (err: any) {
            notify('Error', err.message, 'error', 5000, 'email-2fa-toggle');
        }
    };

    // Notification Settings
    const [notificationSettings, { refetch: refetchNotificationSettings }] = createResource(async () => {
        try {
            return await apiRequest('GET', '/api/notifications/settings');
        } catch { return null; }
    });

    const handleToggleNotification = async (key: string) => {
        const current = notificationSettings();
        if (!current) return;

        const newData = { ...current, [key]: !current[key] };
        try {
            await apiRequest('POST', '/api/notifications/settings', newData);
            notify('Success', 'Preferences updated.', 'success', 2000);
            refetchNotificationSettings();
        } catch (err: any) {
            notify('Error', 'Failed to update preferences.', 'error');
        }
    };

    // Passkeys
    const [isPasskeyModalOpen, setIsPasskeyModalOpen] = createSignal(false);
    const [passkeys, { refetch: refetchPasskeys }] = createResource(async () => {
        return await apiRequest('GET', '/api/auth/passkeys');
    });

    const handleAddPasskey = async () => {
        notify('Info', 'Registering passkey...', 'info', 5000, 'passkey-add');
        try {
            const options = await apiRequest('GET', '/api/auth/passkey/register-options');
            const attResp = await SimpleWebAuthnBrowser.startRegistration(options);
            await apiRequest('POST', '/api/auth/passkey/register-verify', attResp);
            notify('Success', 'Passkey registered!', 'success', 3000, 'passkey-add');
            refetchPasskeys();
        } catch (err: any) {
            if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
                notify('Warning', 'Registration cancelled.', 'warning', 3000, 'passkey-add');
                return;
            }
            notify('Error', err.message, 'error', 5000, 'passkey-add');
        }
    };

    const handleDeletePasskey = async (id: string) => {
        if (await showConfirmModal('Delete Passkey?', 'Are you sure?')) {
            notify('Info', 'Removing passkey...', 'info', 5000, 'passkey-delete');
            try {
                await apiRequest('DELETE', `/api/auth/passkeys/${id}`);
                notify('Success', 'Passkey removed.', 'success', 3000, 'passkey-delete');
                refetchPasskeys();
            } catch (err) {
                notify('Error', 'Failed to delete passkey.', 'error', 5000, 'passkey-delete');
            }
        }
    };

    // Calendar Integration
    const [calendarToken, setCalendarToken] = createSignal<string | null>(null);
    const [isGeneratingToken, setIsGeneratingToken] = createSignal(false);

    const ensureCalendarToken = async () => {
        if (calendarToken()) return calendarToken();
        setIsGeneratingToken(true);
        try {
            const data = await apiRequest('POST', '/api/calendar/token');
            setCalendarToken(data.token);
            return data.token;
        } catch (err) {
            notify('Error', 'Failed to generate calendar token.', 'error');
            return null;
        } finally {
            setIsGeneratingToken(false);
        }
    };

    const handleCopyCalendarLink = async (path: string, label: string) => {
        const token = await ensureCalendarToken();
        if (!token) return;
        
        const url = `${window.location.origin}/api/calendar/${path}/${token}.ics`;
        navigator.clipboard.writeText(url);
        notify('Success', `${label} copied to clipboard!`, 'success', 2000);
    };

    const handleSubscribeCalendar = async (path: string) => {
        const token = await ensureCalendarToken();
        if (!token) return;

        // webcal:// protocol opens the default calendar app
        const url = `${window.location.origin.replace(/^https?:\/\//, 'webcal://')}/api/calendar/${path}/${token}.ics`;
        window.open(url, '_self');
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        notify('Success', `${label} copied to clipboard!`, 'success', 2000);
    };

    // Email Management
    const [userEmails, { refetch: refetchEmails }] = createResource(async () => {
        return await apiRequest('GET', '/api/users/me/emails');
    });

    const [isAddingEmail, setIsAddingEmail] = createSignal(false);
    const handleAddEmail = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const email = (new FormData(form)).get('new-email') as string;
        
        setIsAddingEmail(true);
        try {
            await apiRequest('POST', '/api/users/me/emails', { email });
            notify('Success', 'Verification email sent.', 'success');
            form.reset();
            refetchEmails();
        } catch (err: any) {
            notify('Error', err.message, 'error');
        } finally {
            setIsAddingEmail(false);
        }
    };

    const handleDeleteEmail = async (id: number) => {
        if (await showConfirmModal('Delete Email?', 'Are you sure?')) {
            try {
                await apiRequest('DELETE', `/api/users/me/emails/${id}`);
                notify('Success', 'Email deleted.', 'success');
                refetchEmails();
            } catch (err: any) {
                notify('Error', err.message, 'error');
            }
        }
    };

    const handleSetPrimary = async (id: number) => {
        try {
            await apiRequest('POST', `/api/users/me/emails/${id}/set-primary`);
            notify('Success', 'Primary email updated.', 'success');
            refetchEmails();
            refetch(); // Update main profile email
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    return (
        <Show when={profile()} fallback={<p aria-busy="true">Loading...</p>}>
            <section class="dashboard-section active">
                <Panel title="Email Addresses" class="glass-panel mb-4">
                    <p>Manage the email addresses associated with your account. You can log in with any verified email.</p>
                    <div class="item-list" style={{ "margin-bottom": "1.5rem" }}>
                        <For each={userEmails() || []} fallback={<p aria-busy="true">Loading emails...</p>}>
                            {(email) => (
                                <div class="list-item">
                                    <div class="item-details">
                                        <span class="item-title">{email.email}</span>
                                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                                            <Show when={email.is_primary}>
                                                <span class="status-tag success">Primary</span>
                                            </Show>
                                            <Show when={!email.is_verified}>
                                                <span class="status-tag warning">Unverified</span>
                                            </Show>
                                        </div>
                                    </div>
                                    <div class="item-value-group">
                                        <Show when={!email.is_primary && email.is_verified}>
                                            <button class="small-btn secondary mini-btn" onClick={() => handleSetPrimary(email.id)}>Make Primary</button>
                                        </Show>
                                        <Show when={!email.is_primary}>
                                            <button class="small-btn icon-only delete" onClick={() => handleDeleteEmail(email.id)}><FaSolidXmark /></button>
                                        </Show>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>

                    <form onSubmit={handleAddEmail} class="modern-form inline-form">
                        <div class="form-row">
                            <input name="new-email" type="email" placeholder="Add new email address" required disabled={isAddingEmail()} />
                            <button type="submit" class="secondary" disabled={isAddingEmail()}>
                                {isAddingEmail() ? 'Adding...' : 'Add Email'}
                            </button>
                        </div>
                    </form>
                </Panel>

                <Panel title="Account Security" class="glass-panel mb-4">
                    <div class="settings-grid">
                        <div class="two-fa-grid dual-grid">
                            <div class="liquid-container embedded-panel glass-panel">
                                <div class="setting-info">
                                    <strong>Password</strong>
                                    <p>Manage your account password</p>
                                </div>
                                                                <button class="small-btn secondary" onClick={async () => {
                                                                    const passwords = await showChangePasswordModal(profile()?.email);
                                                                    if (passwords) {                                        try {
                                            await apiRequest('POST', '/api/auth/change-password', passwords);
                                            notify('Success', 'Password changed.', 'success');
                                        } catch (err: any) {
                                            notify('Error', err.message || 'Failed to change password.', 'error');
                                        }
                                    }
                                }}>Change</button>
                            </div>

                            <div class="liquid-container embedded-panel glass-panel">
                                <div class="setting-info">
                                    <strong>Authenticator (TOTP)</strong>
                                    <span class="status-tag" classList={{ 'success': profile()!.totp_enabled, 'warning': !profile()!.totp_enabled }}>
                                        {profile()!.totp_enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                                <Show when={!profile()!.totp_enabled}>
                                    <button class="small-btn secondary" onClick={handleSetupTOTP}>Setup</button>
                                </Show>
                                <Show when={profile()!.totp_enabled}>
                                    <button class="small-btn outline delete" onClick={handleDisableTOTP}>Disable</button>
                                </Show>
                            </div>

                            <div class="liquid-container embedded-panel glass-panel">
                                <div class="setting-info">
                                    <strong>Email 2FA</strong>
                                    <span class="status-tag" classList={{ 'success': profile()!.email_2fa_enabled, 'warning': !profile()!.email_2fa_enabled }}>
                                        {profile()!.email_2fa_enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                                <button
                                    class="small-btn"
                                    classList={{ 'secondary': !profile()!.email_2fa_enabled, 'outline delete': profile()!.email_2fa_enabled }}
                                    onClick={handleToggleEmail2FA}
                                >
                                    {profile()!.email_2fa_enabled ? 'Disable' : 'Enable'}
                                </button>
                            </div>

                            <div class="liquid-container embedded-panel glass-panel">
                                <div class="setting-info">
                                    <strong>Passkey</strong>
                                    <p>{passkeys()?.length || 0} keys registered</p>
                                </div>
                                <button class="small-btn secondary" onClick={() => setIsPasskeyModalOpen(true)}>Manage</button>
                            </div>

                            <div class="liquid-container embedded-panel danger-zone">
                                <div class="setting-info">
                                    <strong style="color: var(--colour-bad)">Delete Account</strong>
                                    <p>Permanently remove your account</p>
                                </div>
                                <button class="small-btn outline delete" onClick={async () => {
                                    const password = await showPasswordModal("Delete Account", "This cannot be undone.");
                                    if (password) {
                                        try {
                                            await apiRequest('POST', '/api/user/deleteAccount', { password });
                                            LoginEvent.notify({ authenticated: false });
                                            navigate('/home');
                                        } catch (err) {
                                            notify('Error', 'Delete failed.', 'error');
                                        }
                                    }
                                }}>Delete</button>
                            </div>
                        </div>
                    </div >
                </Panel >

                <Panel title="Notification Preferences" class="glass-panel mb-4">
                    <p>Decide what updates you want to receive and how you want to be notified.</p>
                    <Show when={notificationSettings()} fallback={<p aria-busy="true">Loading preferences...</p>}>
                        <div class="notification-settings-grid">
                            <table class="modern-table">
                                <thead>
                                    <tr>
                                        <th>Category</th>
                                        <th style="text-align: center;">Email</th>
                                        <th style="text-align: center;">Push</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <strong>Payments</strong>
                                            <p class="small-text">New transactions & balance alerts</p>
                                        </td>
                                        <td style="text-align: center;">
                                            <input type="checkbox" role="switch" checked={notificationSettings()?.email_payments === 1} onChange={() => handleToggleNotification('email_payments')} />
                                        </td>
                                        <td style="text-align: center;">
                                            <input type="checkbox" role="switch" checked={notificationSettings()?.push_payments === 1} onChange={() => handleToggleNotification('push_payments')} />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <strong>Events</strong>
                                            <p class="small-text">Signups, cancellations & updates</p>
                                        </td>
                                        <td style="text-align: center;">
                                            <input type="checkbox" role="switch" checked={notificationSettings()?.email_events === 1} onChange={() => handleToggleNotification('email_events')} />
                                        </td>
                                        <td style="text-align: center;">
                                            <input type="checkbox" role="switch" checked={notificationSettings()?.push_events === 1} onChange={() => handleToggleNotification('push_events')} />
                                        </td>
                                    </tr>
                                                                                        <tr>
                                                                                            <td>
                                                                                                <strong>Club News</strong>
                                                                                                <p class="small-text">Announcements & general updates</p>
                                                                                            </td>
                                                                                            <td style="text-align: center;">
                                                                                                <input type="checkbox" role="switch" checked={notificationSettings()?.email_news === 1} onChange={() => handleToggleNotification('email_news')} />
                                                                                            </td>
                                                                                            <td style="text-align: center;">
                                                                                                <input type="checkbox" role="switch" checked={notificationSettings()?.push_news === 1} onChange={() => handleToggleNotification('push_news')} />
                                                                                            </td>
                                                                                        </tr>
                                                                                        <tr>
                                                        <td>
                                                            <strong>Event Reminders</strong>
                                                            <p class="small-text">Alerts 30 mins before your joined events</p>
                                                        </td>
                                                        <td style="text-align: center;">
                                                            <input type="checkbox" role="switch" checked={notificationSettings()?.email_event_reminders === 1} onChange={() => handleToggleNotification('email_event_reminders')} />
                                                        </td>
                                                        <td style="text-align: center;">
                                                            <input type="checkbox" role="switch" checked={notificationSettings()?.push_event_reminders === 1} onChange={() => handleToggleNotification('push_event_reminders')} />
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </Show>
                                </Panel>

                <Panel title="Calendar Integration" class="glass-panel mb-4">
                    <p>Import club events directly into your favorite calendar app (Google, Apple, Outlook, etc.).</p>
                    <div class="settings-grid">
                        <div class="two-fa-grid dual-grid">
                            <div class="liquid-container embedded-panel glass-panel">
                                <div class="setting-info">
                                    <strong>All Events Feed</strong>
                                    <p>Public events everyone can see.</p>
                                </div>
                                <div class="btn-group">
                                    <button class="small-btn primary" onClick={() => {
                                        const url = `${window.location.origin.replace(/^https?:\/\//, 'webcal://')}/api/calendar/all.ics`;
                                        window.open(url, '_self');
                                    }}>
                                        Subscribe
                                    </button>
                                    <button class="small-btn icon-only secondary ml-1" onClick={() => copyToClipboard(`${window.location.origin}/api/calendar/all.ics`, 'Public Feed URL')}>
                                        <FaSolidCopy />
                                    </button>
                                </div>
                            </div>

                            <div class="liquid-container embedded-panel glass-panel">
                                <div class="setting-info">
                                    <strong>My Events Feed</strong>
                                    <p>Personalized feed of events you've joined.</p>
                                </div>
                                <div class="btn-group">
                                    <button class="small-btn primary" onClick={() => handleSubscribeCalendar('personal')} disabled={isGeneratingToken()}>
                                        {isGeneratingToken() ? '...' : 'Subscribe'}
                                    </button>
                                    <button class="small-btn icon-only secondary ml-1" onClick={() => handleCopyCalendarLink('personal', 'Personal Feed URL')} disabled={isGeneratingToken()}>
                                        <FaSolidCopy />
                                    </button>
                                </div>
                            </div>

                            <div class="liquid-container embedded-panel glass-panel">
                                <div class="setting-info">
                                    <strong>Accessible Events Feed</strong>
                                    <p>Private feed of all events you can see.</p>
                                </div>
                                <div class="btn-group">
                                    <button class="small-btn primary" onClick={() => handleSubscribeCalendar('accessible')} disabled={isGeneratingToken()}>
                                        {isGeneratingToken() ? '...' : 'Subscribe'}
                                    </button>
                                    <button class="small-btn icon-only secondary ml-1" onClick={() => handleCopyCalendarLink('accessible', 'Accessible Feed URL')} disabled={isGeneratingToken()}>
                                        <FaSolidCopy />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Panel>

                <Panel title="App Installation" class="glass-panel mb-4">
                    <div class="settings-grid">
                        <div class="two-fa-grid dual-grid">
                            <Show when={!isPWAInstalled()}>
                                <div class="liquid-container embedded-panel glass-panel">
                                    <div class="setting-info">
                                        <strong>Install App</strong>
                                        <p>
                                            <Show when={isManualInstall()} fallback={
                                                deferredPrompt()
                                                    ? "Get the official DUCC app for your device."
                                                    : "Look for the install icon in your address bar, or check your browser menu. If not visible, ensure you have used the site for a few minutes."
                                            }>
                                                Tap the Share button or menu and select "Add to Home Screen" (or "Add to Dock")
                                            </Show>
                                        </p>
                                    </div>
                                    <Show when={!isManualInstall()}>
                                        <button
                                            class="small-btn primary"
                                            onClick={installPWA}
                                            disabled={!deferredPrompt()}
                                            title={!deferredPrompt() ? "Browser is still checking if the app can be installed. This usually takes a few moments of browsing." : "Install DUCC"}
                                        >
                                            <FaSolidDownload style={{ "margin-right": "0.25rem", width: "1em", height: "1em" }} />
                                            {deferredPrompt() ? 'Install' : 'Preparing...'}
                                        </button>
                                    </Show>
                                </div>
                            </Show>

                            <div class="liquid-container embedded-panel glass-panel">
                                <div class="setting-info">
                                    <strong>Push Notifications</strong>
                                    <p>
                                        {isSubscribed() 
                                            ? "Notifications are enabled for this device." 
                                            : "Receive alerts for events, payments and news."}
                                    </p>
                                </div>
                                <Show when={!isSubscribed()}>
                                    <button 
                                        class="small-btn primary" 
                                        onClick={handleSubscribe}
                                        disabled={isSubscribing()}
                                    >
                                                                                    <FaSolidBolt style={{ "margin-right": "0.25rem", width: "1em", height: "1em" }} />
                                                                                    {isSubscribing() ? 'Subscribing...' : 'Enable'}                                    </button>
                                </Show>
                                <Show when={isSubscribed()}>
                                    <button 
                                        class="small-btn outline delete" 
                                        onClick={handleUnsubscribe}
                                        disabled={isUnsubscribing()}
                                    >
                                        {isUnsubscribing() ? 'Disabling...' : 'Disable'}
                                    </button>
                                </Show>
                            </div>
                        </div>
                    </div >
                </Panel >
            </section >

            <Modal
                isOpen={isTOTPModalOpen()}
                title="Setup TOTP"
                onClose={() => setIsTOTPModalOpen(false)}
            >
                <div class="totp-setup-flow">
                    <p>Scan this QR code with your authenticator app.</p>
                    <div class="qr-container">
                        <img src={totpSetup()?.qrCodeData} alt="TOTP QR Code" />
                    </div>
                    <div class="manual-secret">
                        <span>Or enter manually:</span>
                        <div class="secret-row">
                            <code>{totpSetup()?.secret}</code>
                            <button onClick={() => navigator.clipboard.writeText(totpSetup()?.secret || '')}><FaSolidCopy /></button>
                        </div>
                    </div>
                    <form onSubmit={handleVerifyTOTP} class="modern-form">
                        <label>Verification Code <input type="text" id="totp-code" name="totp-code" placeholder="123456" required /></label>
                        <button type="submit" class="primary full-width">Verify & Enable</button>
                    </form>
                </div>
            </Modal>

            <Modal
                isOpen={isPasskeyModalOpen()}
                title="Manage Passkeys"
                onClose={() => setIsPasskeyModalOpen(false)}
            >
                <div class="passkey-management">
                    <div class="item-list">
                        <For each={passkeys() || []} fallback={<p>No passkeys registered.</p>}>
                            {(k) => (
                                <div class="list-item">
                                    <div class="item-icon"><FaSolidKey /></div>
                                    <div class="item-details">
                                        <span class="item-title">Passkey</span>
                                        <span class="item-subtitle">Added {new Date(k.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div class="item-value-group">
                                        <button class="small-btn icon-only delete" onClick={() => handleDeletePasskey(k.id)}><FaSolidXmark /></button>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                    <button class="primary full-width" onClick={handleAddPasskey}><FaSolidPlus /> Add Passkey</button>
                </div>
            </Modal>
        </Show>
    );
}

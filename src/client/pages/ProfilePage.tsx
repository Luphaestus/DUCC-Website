// todo clean up
import { createSignal, createResource, onMount, Show, For, createMemo, onCleanup } from "solid-js";
import { useSearchParams, useNavigate } from "@solidjs/router";
import { apiRequest, clearApiCache, uploadFile } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { useAuth } from "@/stores/auth";
import { LoginEvent, BalanceChangedEvent, MembershipChangedEvent, ProfilePictureChangedEvent } from "@/utils/events/events";
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import Panel from "@/components/Panel";
import {
    SETTINGS_SVG, CLOSE_SVG, SOCIAL_LEADERBOARD_SVG, ID_CARD_SVG, POOL_SVG, DASHBOARD_SVG, WALLET_SVG,
    LOGOUT_SVG, EDIT_SVG, GROUP_SVG, KAYAKING_SVG, ADD_SVG, REMOVE_SVG, KEY_SVG,
    CONTENT_COPY_SVG, UPLOAD_SVG, SHIELD_SVG, DOWNLOAD_SVG
} from '@/utils/icons';
import { showConfirmModal, showPasswordModal, showChangePasswordModal } from "@/utils/modal";
import { Tag } from "@/widgets/Tag";
import * as SimpleWebAuthnBrowser from '@simplewebauthn/browser';
import { UploadWidget } from "@/widgets/upload/UploadWidget";
import { TabNav } from "@/widgets/TabNav";
import { onUpdate } from "@/utils/updates";
import { isPWAInstalled, installPWA, isManualInstall, deferredPrompt } from "@/utils/pwa";

interface UserProfile {
    // ... same as before
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    permissions: string[];
    is_member: boolean;
    is_instructor: boolean;
    filled_legal_info: boolean;
    legal_filled_at: string;
    phone_number: string;
    first_aid_expiry: string;
    free_sessions: number;
    balance: number;
    swims: number;
    booties: number;
    swimmer_rank: number;
    profile_picture_path: string;
    profile_picture_color: string;
    profile_picture_font: string;
    profile_picture_initials: string;
    totp_enabled: boolean;
    email_2fa_enabled: boolean;
    swimmer_stats?: {
        allTime: { swims: number; rank: string };
        yearly: { swims: number; rank: string };
    };
}

interface KitVariant {
    id: number;
    name: string;
}

interface KitPref {
    kit_item_id: number;
    kit_variant_id: number | null;
    item_name: string;
    item_type: string;
    variant_name: string | null;
}

export default function ProfilePage() {
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const { logout } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const activeTab = () => searchParams.tab || 'overview';

    const [isKitModalOpen, setIsKitModalOpen] = createSignal(false);
    const [activeKitItem, setActiveKitItem] = createSignal<KitItem | null>(null);

    onMount(() => {
        const cleanup = onUpdate((event) => {
            if (event.type === 'balance_update') {
                refetch();
                refetchTransactions();
            }
        });

        const ppCleanup = ProfilePictureChangedEvent.subscribe(() => {
            refetch();
        });

        onCleanup(() => {
            cleanup();
            ppCleanup();
        });
    });

    const [profile, { refetch }] = createResource(async () => {
        try {
            return await apiRequest('GET', `/api/user/elements/id,permissions,email,first_name,last_name,is_member,is_instructor,filled_legal_info,legal_filled_at,phone_number,first_aid_expiry,free_sessions,balance,swims,booties,swimmer_rank,profile_picture_path,profile_picture_color,profile_picture_font,profile_picture_initials,totp_enabled,email_2fa_enabled,swimmer_stats?t=${Date.now()}`) as UserProfile;
        } catch (e) {
            navigate('/login');
            throw e;
        }
    });

    const [cars, { refetch: refetchCars }] = createResource(async () => {
        const res = await apiRequest('GET', '/api/cars');
        return (res.data || []) as Car[];
    });

    const [transactions, { refetch: refetchTransactions }] = createResource(async () => {
        const res = await apiRequest('GET', '/api/user/elements/transactions');
        return (res.transactions || []) as Transaction[];
    });

    const [userKitPrefs, { refetch: refetchKitPrefs }] = createResource(async () => {
        try {
            const res = await apiRequest('GET', '/api/kit/preferences');
            return (res || []) as KitPref[];
        } catch { return []; }
    });

    const openKitModal = (item: KitItem) => {
        setActiveKitItem(item);
        setIsKitModalOpen(true);
    };

    const handleSelectVariant = async (variantId: number | null) => {
        const item = activeKitItem();
        if (!item) return;

        const current = userKitPrefs() || [];
        let newSelections;

        if (variantId === -1) {
            newSelections = current.filter(p => p.kit_item_id !== item.id)
                .map(p => ({ kit_item_id: p.kit_item_id, kit_variant_id: p.kit_variant_id }));
        } else {
            const newPref = { kit_item_id: item.id, kit_variant_id: variantId };
            const existing = current.find(p => p.kit_item_id === item.id);
            if (existing) {
                newSelections = current.map(p => p.kit_item_id === item.id ? newPref : { kit_item_id: p.kit_item_id, kit_variant_id: p.kit_variant_id });
            } else {
                newSelections = [...current.map(p => ({ kit_item_id: p.kit_item_id, kit_variant_id: p.kit_variant_id })), newPref];
            }
        }

        try {
            await apiRequest('POST', '/api/kit/preferences', { selections: newSelections });
            notify('Success', 'Preferences updated', 'success');
            setIsKitModalOpen(false);
            refetchKitPrefs();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    const [tags] = createResource(async () => {
        try {
            return await apiRequest('GET', '/api/user/tags');
        } catch (e) {
            return [];
        }
    });

    const [kitItems] = createResource(async () => {
        try {
            const res = await apiRequest('GET', '/api/kit');
            return res || [];
        } catch { return []; }
    });

    const [globals] = createResource(async () => {
        const [membershipRes, minMoneyRes] = await Promise.all([
            apiRequest('GET', '/api/globals/MembershipCost'),
            apiRequest('GET', '/api/globals/MinMoney').catch(() => ({ res: { MinMoney: { data: -25 } } }))
        ]);
        return {
            membershipCost: Number(membershipRes.res?.MembershipCost?.data || 50),
            minMoney: Number(minMoneyRes.res?.MinMoney?.data || -25)
        };
    });

    const handleLogout = async () => {
        await logout();
        clearApiCache();
        LoginEvent.notify({ authenticated: false });
        navigate('/home');
    };

    // Car Modal State
    const [isCarModalOpen, setIsCarModalOpen] = createSignal(false);
    const [editingCar, setEditingCar] = createSignal<Car | null>(null);

    const handleOpenCarModal = (car: Car | null = null) => {
        setEditingCar(car);
        setIsCarModalOpen(true);
    };

    const handleSaveCar = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = {
            name: formData.get('name') as string,
            seats: parseInt(formData.get('seats') as string),
            boats: parseInt(formData.get('boats') as string),
            isGlobal: formData.get('isGlobal') === 'on'
        };

        try {
            if (editingCar()) {
                await apiRequest('PUT', `/api/cars/${editingCar()!.id}`, data);
                notify('Success', 'Vehicle updated.', 'success', 3000, 'vehicle-action');
            } else {
                await apiRequest('POST', '/api/cars', data);
                notify('Success', 'Vehicle added.', 'success', 3000, 'vehicle-action');
            }
            setIsCarModalOpen(false);
            refetchCars();
        } catch (err: any) {
            notify('Error', err.message, 'error', 5000, 'vehicle-action');
        }
    };

    const handleDeleteCar = async (id: number) => {
        if (await showConfirmModal('Remove Car?', 'Are you sure you want to remove this vehicle?')) {
            notify('Info', 'Removing vehicle...', 'info', 5000, 'vehicle-action');
            try {
                await apiRequest('DELETE', `/api/cars/${id}`);
                notify('Success', 'Car removed.', 'success', 3000, 'vehicle-action');
                refetchCars();
            } catch (err: any) {
                notify('Error', err.message, 'error', 5000, 'vehicle-action');
            }
        }
    };

    const handleJoinMembership = async () => {
        const cost = globals()?.membershipCost || 50;
        if (await showConfirmModal("Confirm Membership", `Becoming a member costs <strong>£${cost.toFixed(2)}</strong>. Are you sure?`)) {
            try {
                await apiRequest('POST', '/api/user/join');
                notify('Welcome!', 'You are now a club member.', 'success');
                refetch();
                BalanceChangedEvent.notify();
                MembershipChangedEvent.notify();
            } catch (err: any) {
                notify('Error', err.message || 'Failed to join.', 'error');
            }
        }
    };

    // Safety Info State
    const [isEditingSafety, setIsEditingSafety] = createSignal(false);
    const handleSaveSafety = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        try {
            await apiRequest('POST', '/api/user/elements', {
                first_aid_expiry: formData.get('first_aid_expiry'),
                phone_number: formData.get('phone_number')
            });
            notify('Success', 'Safety info updated.', 'success');
            setIsEditingSafety(false);
            refetch();
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    // Instructor Status
    const handleToggleInstructor = async () => {
        const isInstructor = profile()?.is_instructor;
        if (isInstructor) {
            if (await showConfirmModal('Resign?', 'Are you sure you want to resign as an instructor?')) {
                await apiRequest('POST', '/api/user/elements', { is_instructor: false });
                refetch();
            }
        } else {
            await apiRequest('POST', '/api/user/elements', { is_instructor: true });
            refetch();
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

    // Profile Picture Presets
    const colors = ['#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c', '#1abc9c', '#34495e', '#d35400', '#c0392b'];
    const initialsOptions = [
        { label: 'Both', value: 'both' },
        { label: 'First', value: 'first' },
        { label: 'Last', value: 'last' }
    ];
    const fonts = [
        { label: 'Sans', value: 'sans' },
        { label: 'Display', value: 'outfit' },
        { label: 'Serif', value: 'serif' },
        { label: 'Gothic', value: 'gothic' },
        { label: 'Retro', value: 'accent' },
        { label: 'Mono', value: 'mono' }
    ];

    const updatePP = async (data: any) => {
        const p = profile()!;
        try {
            await apiRequest('POST', '/api/user/profile-picture', {
                fileId: null,
                color: p.profile_picture_color,
                font: p.profile_picture_font,
                initials: p.profile_picture_initials,
                ...data
            });
            ProfilePictureChangedEvent.notify();
            refetch();
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    let uploadWidget: UploadWidget | null = null;
    onMount(() => {
        uploadWidget = new UploadWidget('avatar-upload-container', {
            mode: 'inline',
            enableLibrary: false,
            enableUrl: false,
            showActions: false,
            showPreview: false,
            enableCrop: true,
            onImageSelect: async ({ id }) => {
                if (!id) return;
                try {
                    await apiRequest('POST', '/api/user/profile-picture', { fileId: id });
                    notify('Success', 'Profile picture updated.', 'success');
                    ProfilePictureChangedEvent.notify();
                    refetch();
                } catch (err: any) {
                    notify('Error', err.message, 'error');
                }
            }
        });
    });

    return (
        <div id="profile-view" class="view">
            <div id="avatar-upload-container" style="display: none;"></div>
            <div class="dashboard-container">
                <aside class="dashboard-sidebar">
                    <TabNav class="vertical-sidebar liquid-container">
                        <button class="nav-item" classList={{ active: activeTab() === 'overview' }} onClick={() => setSearchParams({ tab: 'overview' })}>
                            <span innerHTML={DASHBOARD_SVG} /> Overview
                        </button>
                        <button class="nav-item" classList={{ active: activeTab() === 'cars' }} onClick={() => setSearchParams({ tab: 'cars' })}>
                            <span innerHTML={GROUP_SVG} /> Cars
                        </button>
                        <button class="nav-item" classList={{ active: activeTab() === 'kit' }} onClick={() => setSearchParams({ tab: 'kit' })}>
                            <span innerHTML={KAYAKING_SVG} /> Kit
                        </button>
                        <button class="nav-item" classList={{ active: activeTab() === 'balance' }} onClick={() => setSearchParams({ tab: 'balance' })}>
                            <span innerHTML={WALLET_SVG} /> Balance
                        </button>
                        <button class="nav-item" classList={{ active: activeTab() === 'settings' }} onClick={() => setSearchParams({ tab: 'settings' })}>
                            <span innerHTML={SETTINGS_SVG} /> Settings
                        </button>
                        <div class="sidebar-spacer"></div>
                        <button class="nav-item logout" onClick={handleLogout}>
                            <span innerHTML={LOGOUT_SVG} /> Sign Out
                        </button>
                    </TabNav>
                </aside>

                <main class="dashboard-content">
                    <Show when={profile()} fallback={<p aria-busy="true">Loading profile...</p>}>
                        <Show when={activeTab() === 'overview'}>
                            <section class="dashboard-section active">
                                <Show when={!profile()!.is_member}>
                                    <article class="accent-panel liquid-container glass-panel no-margin" style={{ "--liquid-border-radius": "24px", "border": "none" }}>
                                        <div class="panel-content">
                                            <h2>You aren't a member yet</h2>
                                            <p>You have <strong>{profile()!.free_sessions}</strong> free trial events remaining before membership is required.</p>
                                        </div>
                                        <div class="panel-action">
                                            <button onClick={handleJoinMembership}>Become a Member</button>
                                        </div>
                                    </article>
                                </Show>

                                <div class="profile-overview-grid">
                                    <div class="overview-main">
                                        <Panel 
                                            title="Swimming Statistics" 
                                            icon={POOL_SVG}
                                            action={
                                                <button class="small-btn secondary" onClick={() => navigate('/swims')}>
                                                    <span innerHTML={SOCIAL_LEADERBOARD_SVG} /> Leaderboard
                                                </button>
                                            }
                                        >
                                            <div class="stats-grid">
                                                <div class="stat-item">
                                                    <span class="stat-value">{profile()!.swimmer_stats?.yearly.swims || 0}</span>
                                                    <span class="stat-label">Yearly Swims</span>
                                                </div>
                                                <div class="stat-item">
                                                    <span class="stat-value">{profile()!.swimmer_stats?.yearly.rank || '-'}</span>
                                                    <span class="stat-label">Yearly Rank</span>
                                                </div>
                                                <div class="stat-item">
                                                    <span class="stat-value">{profile()!.swims}</span>
                                                    <span class="stat-label">Total Swims</span>
                                                </div>
                                                <div class="stat-item">
                                                    <span class="stat-value">{profile()!.booties}</span>
                                                    <span class="stat-label">Total Booties</span>
                                                </div>
                                                <div class="stat-item">
                                                    <span class="stat-value">#{profile()!.swimmer_rank}</span>
                                                    <span class="stat-label">All Time Rank</span>
                                                </div>
                                            </div>
                                        </Panel>

                                        <Panel title="Club Status & Roles" icon={GROUP_SVG} class="glass-panel no-margin">
                                            <div class="info-rows">
                                                <div class="info-row">
                                                    <span>Membership</span>
                                                    <span class={`badge ${profile()!.is_member ? 'primary' : 'neutral'}`}>
                                                        {profile()!.is_member ? 'Active Member' : `${profile()!.free_sessions} Trials Left`}
                                                    </span>
                                                </div>
                                                <div class="info-row">
                                                    <span>Legal Waiver</span>
                                                    <button 
                                                        class="small-btn mini-bt no-margin" 
                                                        classList={{ 
                                                            'warning': !profile()!.filled_legal_info,
                                                            'secondary': profile()!.filled_legal_info
                                                        }} 
                                                        onClick={() => navigate('/legal')}
                                                    >
                                                        {profile()!.filled_legal_info ? 'Signed' : 'Sign Now'}
                                                    </button>
                                                </div>
                                                <div class="info-row">
                                                    <span>Instructor</span>
                                                    <div>
                                                        <button class="small-btn mini-bt no-margin" onClick={handleToggleInstructor}>
                                                            {profile()!.is_instructor ? 'Resign' : 'Apply'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <Show when={tags()?.length > 0}>
                                                <div class="tags-section" style="border-top: 1px solid rgba(var(--pico-color-rgb), 0.1); padding-top: 1rem;">
                                                    <h4 class="small-title mb-2">My Groups</h4>
                                                    <div class="tags-list">
                                                        <For each={tags()}>
                                                            {(tag) => <Tag name={tag.name} color={tag.color} />}
                                                        </For>
                                                    </div>
                                                </div>
                                            </Show>
                                        </Panel>
                                    </div>

                                    <div class="overview-side">
                                        <Panel title="Profile Appearance" class="glass-panel" icon={ID_CARD_SVG}>
                                            <div class="profile-avatar-row compact-customization">
                                                <div class="profile-picture-container" onClick={() => uploadWidget?.inputEl.click()}>
                                                    <Avatar user={profile()!} classes="large" />
                                                    <div class="avatar-overlay" innerHTML={UPLOAD_SVG}></div>
                                                </div>
                                                <div class="profile-avatar-controls">
                                                    <div class="avatar-presets">
                                                        <h4 class="small-title">Colour Presets</h4>
                                                        <div class="presets-grid" style="grid-template-columns: repeat(5, 1fr); gap: 0.5rem;">
                                                            <For each={colors}>
                                                                {(color) => (
                                                                    <div
                                                                        class="preset-item color-preset profile-avatar-size"
                                                                        classList={{ active: profile()!.profile_picture_color === color }}
                                                                        onClick={() => updatePP({ color })}
                                                                    >
                                                                        <Avatar user={{ ...profile()!, profile_picture_color: color, profile_picture_path: null }} classes="mini-avatar" />
                                                                    </div>
                                                                )}
                                                            </For>
                                                        </div>
                                                        <div class="grid mt-4" style="gap: 1rem;">
                                                            <div>
                                                                <h4 class="small-title">Initials</h4>
                                                                <div class="presets-grid" style="grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
                                                                    <For each={initialsOptions}>
                                                                        {(opt) => (
                                                                            <div
                                                                                class="preset-item initials-preset profile-avatar-size"
                                                                                classList={{ active: profile()!.profile_picture_initials === opt.value }}
                                                                                onClick={() => updatePP({ initials: opt.value })}
                                                                            >
                                                                                <Avatar user={{ ...profile()!, profile_picture_initials: opt.value, profile_picture_path: null }} classes="mini-avatar" />
                                                                            </div>
                                                                        )}
                                                                    </For>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Panel>

                                        <Panel title="Safety & Contact" icon={SHIELD_SVG} class="glass-panel no-margin">
                                            <div class="info-rows">
                                                <div class="info-row">
                                                    <span>Emergency Contact</span>
                                                    <span>{profile()!.phone_number || 'N/A'}</span>
                                                </div>
                                                <div class="info-row">
                                                    <span>First Aid</span>
                                                    <span>{profile()!.first_aid_expiry || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <div class="form-actions mt-4">
                                                <button class="small-btn secondary full-width" onClick={() => setIsEditingSafety(true)}>
                                                    <span innerHTML={EDIT_SVG} /> Edit Safety Info
                                                </button>
                                            </div>
                                        </Panel>
                                    </div>
                                </div>
                            </section>

                            <Modal isOpen={isEditingSafety()} onClose={() => setIsEditingSafety(false)} title="Update Safety Info">
                                <form onSubmit={handleSaveSafety} class="modern-form">
                                    <label>First Aid Expiry
                                        <input name="first_aid_expiry" type="date" value={profile()!.first_aid_expiry || ''} />
                                    </label>
                                    <label>Emergency Contact
                                        <input name="phone_number" type="tel" value={profile()!.phone_number || ''} placeholder="07700 900000" />
                                    </label>
                                    <div class="form-actions mt-4">
                                        <button type="button" class="secondary" onClick={() => setIsEditingSafety(false)}>Cancel</button>
                                        <button type="submit" class="primary">Save Changes</button>
                                    </div>
                                </form>
                            </Modal>
                        </Show>

                        <Show when={activeTab() === 'cars'}>
                            <section class="dashboard-section active">
                                <Panel 
                                    title="My Vehicles" 
                                    icon={GROUP_SVG}
                                    class="glass-panel"
                                    action={
                                        <button class="small-btn primary" onClick={() => handleOpenCarModal()}>
                                            <span innerHTML={ADD_SVG} /> Add Car
                                        </button>
                                    }
                                >
                                    <div class="item-list">
                                        <For each={cars()} fallback={<p>No cars found.</p>}>
                                            {(car) => (
                                                <div class="list-item">
                                                    <div class="item-icon"><span innerHTML={GROUP_SVG} /></div>
                                                    <div class="item-details">
                                                        <span class="item-title">{car.name}</span>
                                                        <span class="item-subtitle">{car.seats} Seats • {car.boats} Boats {car.is_global && <span class="badge primary">Global</span>}</span>
                                                    </div>
                                                    <div class="item-value-group">
                                                        <div class="button-group">
                                                            <button class="small-btn icon-only secondary" onClick={() => handleOpenCarModal(car)} title="Edit Car">
                                                                <span innerHTML={EDIT_SVG} />
                                                            </button>
                                                            <button class="small-btn icon-only delete" onClick={() => handleDeleteCar(car.id)} title="Remove Car">
                                                                <span innerHTML={CLOSE_SVG} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </For>
                                    </div>
                                </Panel>
                            </section>
                        </Show>

                        <Show when={activeTab() === 'kit'}>
                            <section class="dashboard-section active">
                                <Panel 
                                    title="Default Kit Requirements" 
                                    icon={KAYAKING_SVG}
                                    class="glass-panel"
                                >
                                    <p>Select the equipment you usually need to borrow from the club for trips. These will be your default requests when you join an event.</p>
                                    
                                    <div class="item-list">
                                        <For each={kitItems() || []}>
                                            {(item) => {
                                                const pref = createMemo(() => userKitPrefs()?.find(p => p.kit_item_id === item.id));
                                                const isSelected = () => !!pref();
                                                const variantLabel = () => {
                                                    const p = pref();
                                                    if (!p) return '';
                                                    return p.variant_name ? ` (${p.variant_name})` : ' (Not Sure)';
                                                };

                                                return (
                                                    <div 
                                                        class="list-item clickable" 
                                                        classList={{ 'primary-glass': isSelected() }}
                                                        onClick={() => openKitModal(item)}
                                                    >
                                                        <div class="item-icon"><span innerHTML={KAYAKING_SVG} /></div>
                                                        <div class="item-details">
                                                            <span class="item-title">{item.name}{variantLabel()}</span>
                                                            <span class="item-subtitle">{item.type} • {item.variants?.map(v => v.name).join(', ') || 'No variants'}</span>
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                        </For>
                                    </div>
                                </Panel>
                            </section>
                        </Show>

                        <Show when={activeTab() === 'balance'}>
                            <section class="dashboard-section active">
                                <article class="value-header liquid-container glass-panel no-margin">   
                                    <div class="value-info">
                                        <span class="value-title">Current Balance</span>
                                        <div class="value-display" classList={{
                                            'positive': profile()!.balance >= 0,
                                            'negative': profile()!.balance < (globals()?.minMoney || -25),
                                            'warning': profile()!.balance < 0 && profile()!.balance >= (globals()?.minMoney || -25)
                                        }}>
                                            £{profile()!.balance.toFixed(2)}
                                        </div>
                                    </div>
                                    <div class="value-actions">
                                        <button class="small-btn primary" onClick={() => {
                                            const reference = profile()!.first_name.charAt(0).toUpperCase() + profile()!.last_name.toUpperCase() + "WEBSITE";
                                            showConfirmModal("Top Up Balance", `Please transfer to:<br>Bank: Durham University<br>Sort: 20-27-66<br>Acc: 53770109<br>Ref: ${reference}`);
                                        }}>Top Up</button>
                                    </div>
                                </article>

                                <Panel title="Transaction History" class="glass-panel no-margin">
                                    <div class="item-list">
                                        <For each={transactions()} fallback={<p>No transactions found.</p>}>
                                            {(tx) => (
                                                <div class="list-item">
                                                    <div class="item-icon" classList={{ 'positive': tx.amount > 0, 'negative': tx.amount < 0 }}>
                                                        <span innerHTML={tx.amount > 0 ? ADD_SVG : REMOVE_SVG} />
                                                    </div>
                                                    <div class="item-details">
                                                        <span class="item-title">{tx.description}</span>
                                                        <span class="item-subtitle">{new Date(tx.created_at).toLocaleDateString('en-GB')}</span>
                                                    </div>
                                                    <div class="item-value-group">
                                                        <span class="item-value" classList={{ 'positive': tx.amount > 0, 'negative': tx.amount < 0 }}>
                                                            {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                                                        </span>
                                                        <span class="item-extra">£{tx.after?.toFixed(2) || '0.00'}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </For>
                                    </div>
                                </Panel>
                            </section>
                        </Show>

                        <Show when={activeTab() === 'settings'}>
                            <section class="dashboard-section active">
                                <Panel title="Account Security" class="glass-panel">
                                    <div class="settings-grid">
                                        <div class="two-fa-grid dual-grid mt-4">
                                            <div class="liquid-container embedded-panel glass-panel" style={{ "--liquid-padding": "1.25rem", "--liquid-border-radius": "16px" }}>
                                                <div class="setting-info">
                                                    <strong>Password</strong>
                                                    <p>Manage your account password</p>
                                                </div>
                                                <button class="small-btn secondary" onClick={async () => {
                                                    const passwords = await showChangePasswordModal();
                                                    if (passwords) {
                                                        try {
                                                            await apiRequest('POST', '/api/auth/change-password', passwords);
                                                            notify('Success', 'Password changed.', 'success');
                                                        } catch (err: any) {
                                                            notify('Error', err.message || 'Failed to change password.', 'error');
                                                        }
                                                    }
                                                }}>Change</button>
                                            </div>

                                            <div class="liquid-container embedded-panel glass-panel" style={{ "--liquid-padding": "1.25rem", "--liquid-border-radius": "16px" }}>
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

                                            <div class="liquid-container embedded-panel glass-panel" style={{ "--liquid-padding": "1.25rem", "--liquid-border-radius": "16px" }}>
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

                                            <div class="liquid-container embedded-panel glass-panel" style={{ "--liquid-padding": "1.25rem", "--liquid-border-radius": "16px" }}>
                                                <div class="setting-info">
                                                    <strong>Passkey</strong>
                                                    <p>{passkeys()?.length || 0} keys registered</p>
                                                </div>
                                                <button class="small-btn secondary" onClick={() => setIsPasskeyModalOpen(true)}>Manage</button>
                                            </div>

                                            <div class="liquid-container embedded-panel danger-zone" style={{ "--liquid-padding": "1.25rem", "--liquid-border-radius": "16px" }}>
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

                                            <Show when={!isPWAInstalled()}>
                                                <div class="liquid-container embedded-panel glass-panel" style={{ "--liquid-padding": "1.25rem", "--liquid-border-radius": "16px" }}>
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
                                                            <span innerHTML={DOWNLOAD_SVG} style="margin-right: 0.25rem; width: 1em; height: 1em;" /> 
                                                            {deferredPrompt() ? 'Install' : 'Preparing...'}
                                                        </button>
                                                    </Show>
                                                </div>
                                            </Show>
                                        </div>
                                    </div>
                                </Panel>
                            </section>
                        </Show>
                    </Show>
                </main>
            </div>

            <Modal
                isOpen={isCarModalOpen()}
                title={editingCar() ? 'Edit Vehicle' : 'Add New Vehicle'}
                onClose={() => setIsCarModalOpen(false)}
            >
                <form onSubmit={handleSaveCar} class="modern-form">
                    <label>Car Name
                        <input name="name" type="text" value={editingCar()?.name || ''} required />
                    </label>
                    <div class="grid">
                        <label>Seats
                            <input name="seats" type="number" value={editingCar()?.seats || 5} min="1" required />
                        </label>
                        <label>Boats
                            <input name="boats" type="number" value={editingCar()?.boats || 0} min="0" required />
                        </label>
                    </div>
                    <Show when={profile()?.permissions?.includes('car.manage_global')}>
                        <label>
                            <input name="isGlobal" type="checkbox" checked={editingCar()?.is_global} /> Global
                        </label>
                    </Show>
                    <button type="submit" class="primary full-width">Save Vehicle</button>
                </form>
            </Modal>

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
                            <button onClick={() => navigator.clipboard.writeText(totpSetup()?.secret || '')} innerHTML={CONTENT_COPY_SVG}></button>
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
                        <For each={passkeys()} fallback={<p>No passkeys registered.</p>}>
                            {(k) => (
                                <div class="list-item">
                                    <div class="item-icon"><span innerHTML={KEY_SVG} /></div>
                                    <div class="item-details">
                                        <span class="item-title">Passkey</span>
                                        <span class="item-subtitle">Added {new Date(k.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div class="item-value-group">
                                        <button class="small-btn icon-only delete" onClick={() => handleDeletePasskey(k.id)} innerHTML={CLOSE_SVG}></button>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                    <button class="primary full-width mt-4" onClick={handleAddPasskey}><span innerHTML={ADD_SVG} /> Add Passkey</button>
                </div>
            </Modal>

            <Modal isOpen={isKitModalOpen()} onClose={() => setIsKitModalOpen(false)} title={`Default ${activeKitItem()?.name}`}>
                <div class="variant-selection">
                    <p>Select your default size/variant for {activeKitItem()?.name}:</p>
                    <div class="item-list mb-4">
                        <For each={activeKitItem()?.variants || []}>
                            {(variant) => (
                                <button 
                                    class="list-item clickable" 
                                    onClick={() => handleSelectVariant(variant.id)}
                                >
                                    <div class="item-details">
                                        <span class="item-title">{variant.name}</span>
                                    </div>
                                </button>
                            )}
                        </For>
                        <button 
                            class="list-item clickable" 
                            onClick={() => handleSelectVariant(null)}
                        >
                            <div class="item-details">
                                <span class="item-title">Don't Know / Not Sure</span>
                                <span class="item-subtitle">Pick each time you join an event</span>
                            </div>
                        </button>
                        
                        <Show when={userKitPrefs()?.some(p => p.kit_item_id === activeKitItem()?.id)}>
                            <button 
                                class="list-item clickable danger-hover" 
                                onClick={() => handleSelectVariant(-1)}
                                style="margin-top: 1rem; border-color: var(--error-color);"
                            >
                                <div class="item-details">
                                    <span class="item-title" style="color: var(--error-color);">Remove Default Preference</span>
                                </div>
                            </button>
                        </Show>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

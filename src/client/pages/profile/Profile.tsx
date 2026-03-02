import { createContext, useContext, createResource, onMount, onCleanup, Show, createSignal, For } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import { apiRequest, clearApiCache } from "@/utils/api";
import { useAuth } from "@/stores/auth";
import { useNotifications } from "@/stores/notifications";
import Modal from "@/components/Modal";
import UploadWidget from "@/components/UploadWidget";
import { showConfirmModal, showPasswordModal, showChangePasswordModal } from "@/utils/modal";
import { smartDateAdjust } from "@/utils/utils";
import {
    LoginEvent,
    ProfilePictureChangedEvent,
    BalanceChangedEvent,
    MembershipChangedEvent
} from "@/utils/events/events";
import { onUpdate } from "@/utils/updates";
import { TabNav } from "@/widgets/TabNav";
import {
    FaSolidGaugeHigh,
    FaSolidCar,
    FaSolidAnchor,
    FaSolidWallet,
    FaSolidGear,
    FaSolidArrowRightFromBracket,
    FaSolidXmark,
    FaSolidKey,
    FaSolidPlus,
    FaSolidCopy
} from "solid-icons/fa";
import * as SimpleWebAuthnBrowser from "@simplewebauthn/browser";
import {
    isPWAInstalled,
    installPWA,
    isManualInstall,
    deferredPrompt,
    isSubscribed,
    setIsSubscribed,
    subscribeToNotifications,
    unsubscribeFromNotifications
} from "@/utils/pwa";
import { UserProfile, Transaction, Car, KitItem, KitPref } from "./types";
import LegalInfoRequiredPanel from "./components/LegalInfoRequiredPanel";
import MembershipPromptPanel from "./components/MembershipPromptPanel";
import SwimmingStatisticsPanel from "./components/SwimmingStatisticsPanel";
import ClubStatusAndRolesPanel from "./components/ClubStatusAndRolesPanel";
import ProfileAppearancePanel from "./components/ProfileAppearancePanel";
import SafetyAndContactPanel from "./components/SafetyAndContactPanel";
import MyVehiclesPanel from "./components/MyVehiclesPanel";
import DefaultKitRequirementsPanel from "./components/DefaultKitRequirementsPanel";
import CurrentBalancePanel from "./components/CurrentBalancePanel";
import HowToTopUpPanel from "./components/HowToTopUpPanel";
import TransactionHistoryPanel from "./components/TransactionHistoryPanel";
import EmailAddressesPanel from "./components/EmailAddressesPanel";
import AccountSecurityPanel from "./components/AccountSecurityPanel";
import NotificationPreferencesPanel from "./components/NotificationPreferencesPanel";
import CalendarIntegrationPanel from "./components/CalendarIntegrationPanel";
import AppInstallationPanel from "./components/AppInstallationPanel";

interface ProfileContextType {
    profile: () => UserProfile | undefined;
    refetch: () => void;
}

const ProfileContext = createContext<ProfileContextType>();

export function useProfile() {
    return useContext(ProfileContext);
}

export default function Profile() {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();

    const [profile, { refetch }] = createResource(async () => {
        try {
            return await apiRequest('GET', `/api/user/elements/id,permissions,email,first_name,last_name,is_member,is_instructor,filled_legal_info,legal_filled_at,phone_number,first_aid_expiry,free_sessions,balance,swims,booties,swimmer_rank,profile_picture_path,profile_picture_color,profile_picture_font,profile_picture_initials,totp_enabled,email_2fa_enabled,swimmer_stats?t=${Date.now()}`) as UserProfile;
        } catch (e) {
            navigate('/login');
            throw e;
        }
    });

    onMount(() => {
        const cleanup = onUpdate((event) => {
            if (event.type === 'balance_update') {
                refetch();
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

    const handleLogout = async () => {
        await logout();
        clearApiCache();
        LoginEvent.notify({ authenticated: false });
        navigate('/home');
    };

    const isActive = (path: string) => {
        if (path === '/profile' && location.pathname === '/profile') return true;
        return location.pathname === path;
    };

    const currentTab = () => {
        if (location.pathname === '/profile/cars') return 'cars';
        if (location.pathname === '/profile/kit') return 'kit';
        if (location.pathname === '/profile/balance') return 'balance';
        if (location.pathname === '/profile/settings') return 'settings';
        return 'overview';
    };

    return (
        <ProfileContext.Provider value={{ profile, refetch }}>
            <div id="profile-view" class="view">
                <div class="dashboard-container">
                    <aside class="dashboard-sidebar">
                        <TabNav class="vertical-sidebar liquid-container">
                            <button class="nav-item" classList={{ active: isActive('/profile') }} onClick={() => navigate('/profile')}>
                                <FaSolidGaugeHigh /> Overview
                            </button>
                            <button class="nav-item" classList={{ active: isActive('/profile/cars') }} onClick={() => navigate('/profile/cars')}>
                                <FaSolidCar /> Cars
                            </button>
                            <button class="nav-item" classList={{ active: isActive('/profile/kit') }} onClick={() => navigate('/profile/kit')}>
                                <FaSolidAnchor /> Kit
                            </button>
                            <button class="nav-item" classList={{ active: isActive('/profile/balance') }} onClick={() => navigate('/profile/balance')}>
                                <FaSolidWallet /> Balance
                            </button>
                            <button class="nav-item" classList={{ active: isActive('/profile/settings') }} onClick={() => navigate('/profile/settings')}>
                                <FaSolidGear /> Settings
                            </button>
                            <div class="sidebar-spacer"></div>
                            <button class="nav-item logout" onClick={handleLogout}>
                                <FaSolidArrowRightFromBracket /> Sign Out
                            </button>
                        </TabNav>
                    </aside>

                    <main class="dashboard-content">
                        <Show when={currentTab() === 'overview'}>
                            <OverviewPanelsSection />
                        </Show>
                        <Show when={currentTab() === 'cars'}>
                            <CarsPanelsSection />
                        </Show>
                        <Show when={currentTab() === 'kit'}>
                            <KitPanelsSection />
                        </Show>
                        <Show when={currentTab() === 'balance'}>
                            <BalancePanelsSection />
                        </Show>
                        <Show when={currentTab() === 'settings'}>
                            <SettingsPanelsSection />
                        </Show>
                    </main>
                </div>
            </div>
        </ProfileContext.Provider>
    );
}

function OverviewPanelsSection() {
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const context = useProfile();
    const profile = () => context?.profile();
    const refetch = () => context?.refetch();

    const [tags] = createResource(async () => {
        try {
            return await apiRequest("GET", "/api/user/tags");
        } catch (e) {
            return [];
        }
    });

    const [globals] = createResource(async () => {
        try {
            const membershipRes = await apiRequest("GET", "/api/globals/MembershipCost");
            return {
                membershipCost: Number(membershipRes.res?.MembershipCost?.data || 50)
            };
        } catch {
            return { membershipCost: 50 };
        }
    });

    const handleJoinMembership = async () => {
        const cost = globals()?.membershipCost || 50;
        if (await showConfirmModal("Confirm Membership", `Becoming a member costs <strong>£${cost.toFixed(2)}</strong>. Are you sure?`)) {
            try {
                await apiRequest("POST", "/api/user/join");
                notify("Welcome!", "You are now a club member.", "success");
                refetch();
                BalanceChangedEvent.notify();
                MembershipChangedEvent.notify();
            } catch (err: any) {
                notify("Error", err.message || "Failed to join.", "error");
            }
        }
    };

    const [isEditingSafety, setIsEditingSafety] = createSignal(false);
    const handleSaveSafety = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        try {
            await apiRequest("POST", "/api/user/elements", {
                first_aid_expiry: formData.get("first_aid_expiry"),
                phone_number: formData.get("phone_number")
            });
            notify("Success", "Safety info updated.", "success");
            setIsEditingSafety(false);
            refetch();
        } catch (err: any) {
            notify("Error", err.message, "error");
        }
    };

    const handleToggleInstructor = async () => {
        const isInstructor = profile()?.is_instructor;
        if (isInstructor) {
            if (await showConfirmModal("Resign?", "Are you sure you want to resign as an instructor?")) {
                await apiRequest("POST", "/api/user/elements", { is_instructor: false });
                refetch();
            }
        } else {
            await apiRequest("POST", "/api/user/elements", { is_instructor: true });
            refetch();
        }
    };

    const updatePP = async (data: any) => {
        const p = profile()!;
        try {
            await apiRequest("POST", "/api/user/profile-picture", {
                fileId: null,
                color: p.profile_picture_color,
                font: p.profile_picture_font,
                initials: p.profile_picture_initials,
                ...data
            });
            ProfilePictureChangedEvent.notify();
            refetch();
        } catch (err: any) {
            notify("Error", err.message, "error");
        }
    };

    const colors = ["#2ecc71", "#3498db", "#9b59b6", "#f1c40f", "#e67e22", "#e74c3c", "#1abc9c", "#34495e", "#d35400", "#c0392b"];
    const initialsOptions = [
        { label: "Both", value: "both" },
        { label: "First", value: "first" },
        { label: "Last", value: "last" }
    ];
    const fonts = [
        { label: "Sans", value: "sans" },
        { label: "Display", value: "outfit" },
        { label: "Serif", value: "serif" },
        { label: "Gothic", value: "gothic" },
        { label: "Retro", value: "accent" },
        { label: "Mono", value: "mono" }
    ];

    let uploadWidgetRef: { click: () => void } | undefined;

    return (
        <Show when={profile()} fallback={<p aria-busy="true">Loading profile...</p>}>
            <UploadWidget
                mode="hidden"
                ref={(el) => (uploadWidgetRef = el)}
                onImageSelect={async ({ id }) => {
                    if (!id) return;
                    try {
                        await apiRequest("POST", "/api/user/profile-picture", { fileId: id });
                        notify("Success", "Profile picture updated.", "success");
                        ProfilePictureChangedEvent.notify();
                        refetch();
                    } catch (err: any) {
                        notify("Error", err.message, "error");
                    }
                }}
            />
            <section class="dashboard-section active">
                <Show when={!profile()!.filled_legal_info}>
                    <LegalInfoRequiredPanel onCompleteForm={() => navigate("/legal")} />
                </Show>

                <Show when={!profile()!.is_member}>
                    <MembershipPromptPanel profile={profile()!} onBecomeMember={handleJoinMembership} />
                </Show>

                <div class="profile-overview-grid">
                    <div class="overview-main">
                        <SwimmingStatisticsPanel profile={profile()!} onOpenLeaderboard={() => navigate("/swims")} />
                        <ClubStatusAndRolesPanel
                            profile={profile()!}
                            tags={tags() || []}
                            onOpenLegalForm={() => navigate("/legal")}
                            onToggleInstructor={handleToggleInstructor}
                        />
                    </div>

                    <div class="overview-side">
                        <ProfileAppearancePanel
                            profile={profile()!}
                            colors={colors}
                            initialsOptions={initialsOptions}
                            fonts={fonts}
                            onUploadClick={() => uploadWidgetRef?.click()}
                            onUpdate={updatePP}
                        />
                        <SafetyAndContactPanel profile={profile()!} onEdit={() => setIsEditingSafety(true)} />
                    </div>
                </div>
            </section>

            <Modal isOpen={isEditingSafety()} onClose={() => setIsEditingSafety(false)} title="Update Safety Info">
                <form onSubmit={handleSaveSafety} class="modern-form">
                    <label>
                        First Aid Expiry
                        <input
                            name="first_aid_expiry"
                            type="date"
                            value={profile()!.first_aid_expiry || ""}
                            onChange={(e) => {
                                const { date, valid } = smartDateAdjust(e.currentTarget.value);
                                if (valid) e.currentTarget.value = date.toISOString().split("T")[0];
                            }}
                            onFocus={(e) => {
                                if (!e.currentTarget.value) {
                                    e.currentTarget.value = new Date().toISOString().split("T")[0];
                                }
                            }}
                        />
                    </label>
                    <label>
                        Emergency Contact
                        <input name="phone_number" type="tel" value={profile()!.phone_number || ""} placeholder="07700 900000" />
                    </label>
                    <div class="form-actions">
                        <button type="button" class="secondary" onClick={() => setIsEditingSafety(false)}>
                            Cancel
                        </button>
                        <button type="submit" class="primary">
                            Save Changes
                        </button>
                    </div>
                </form>
            </Modal>
        </Show>
    );
}

function CarsPanelsSection() {
    const { notify } = useNotifications();
    const context = useProfile();
    const profile = () => context?.profile();

    const [cars, { refetch: refetchCars }] = createResource(async () => {
        const res = await apiRequest("GET", "/api/cars");
        return (res.data || []) as Car[];
    });

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
            name: formData.get("name") as string,
            seats: parseInt(formData.get("seats") as string),
            boats: parseInt(formData.get("boats") as string),
            isGlobal: formData.get("isGlobal") === "on"
        };

        try {
            if (editingCar()) {
                await apiRequest("PUT", `/api/cars/${editingCar()!.id}`, data);
                notify("Success", "Vehicle updated.", "success", 3000, "vehicle-action");
            } else {
                await apiRequest("POST", "/api/cars", data);
                notify("Success", "Vehicle added.", "success", 3000, "vehicle-action");
            }
            setIsCarModalOpen(false);
            refetchCars();
        } catch (err: any) {
            notify("Error", err.message, "error", 5000, "vehicle-action");
        }
    };

    const handleDeleteCar = async (id: number) => {
        if (await showConfirmModal("Remove Car?", "Are you sure you want to remove this vehicle?")) {
            notify("Info", "Removing vehicle...", "info", 5000, "vehicle-action");
            try {
                await apiRequest("DELETE", `/api/cars/${id}`);
                notify("Success", "Car removed.", "success", 3000, "vehicle-action");
                refetchCars();
            } catch (err: any) {
                notify("Error", err.message, "error", 5000, "vehicle-action");
            }
        }
    };

    return (
        <Show when={profile()} fallback={<p aria-busy="true">Loading...</p>}>
            <section class="dashboard-section active">
                <MyVehiclesPanel cars={cars() || []} onAdd={() => handleOpenCarModal()} onEdit={handleOpenCarModal} onDelete={handleDeleteCar} />
            </section>

            <Modal isOpen={isCarModalOpen()} title={editingCar() ? "Edit Vehicle" : "Add New Vehicle"} onClose={() => setIsCarModalOpen(false)}>
                <form onSubmit={handleSaveCar} class="modern-form">
                    <label>
                        Car Name
                        <input name="name" type="text" value={editingCar()?.name || ""} required />
                    </label>
                    <div class="grid">
                        <label>
                            Seats
                            <input name="seats" type="number" value={editingCar()?.seats || 5} min="1" required />
                        </label>
                        <label>
                            Boats
                            <input name="boats" type="number" value={editingCar()?.boats || 0} min="0" required />
                        </label>
                    </div>
                    <Show when={profile()?.permissions?.includes("car.manage_global")}>
                        <label>
                            <input name="isGlobal" type="checkbox" checked={editingCar()?.is_global} /> Global
                        </label>
                    </Show>
                    <button type="submit" class="primary full-width">
                        Save Vehicle
                    </button>
                </form>
            </Modal>
        </Show>
    );
}

function KitPanelsSection() {
    const { notify } = useNotifications();
    const context = useProfile();
    const profile = () => context?.profile();

    const [userKitPrefs, { refetch: refetchKitPrefs }] = createResource(async () => {
        try {
            const res = await apiRequest("GET", "/api/kit/preferences");
            return (res || []) as KitPref[];
        } catch {
            return [];
        }
    });

    const [kitItems] = createResource(async () => {
        try {
            const res = await apiRequest("GET", "/api/kit");
            return res || [];
        } catch {
            return [];
        }
    });

    const [isKitModalOpen, setIsKitModalOpen] = createSignal(false);
    const [activeKitItem, setActiveKitItem] = createSignal<KitItem | null>(null);

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
            newSelections = current
                .filter((p) => p.kit_item_id !== item.id)
                .map((p) => ({ kit_item_id: p.kit_item_id, kit_variant_id: p.kit_variant_id }));
        } else {
            const newPref = { kit_item_id: item.id, kit_variant_id: variantId };
            const existing = current.find((p) => p.kit_item_id === item.id);
            if (existing) {
                newSelections = current.map((p) =>
                    p.kit_item_id === item.id ? newPref : { kit_item_id: p.kit_item_id, kit_variant_id: p.kit_variant_id }
                );
            } else {
                newSelections = [...current.map((p) => ({ kit_item_id: p.kit_item_id, kit_variant_id: p.kit_variant_id })), newPref];
            }
        }

        try {
            await apiRequest("POST", "/api/kit/preferences", { itemIds: newSelections });
            notify("Success", "Preferences updated", "success");
            setIsKitModalOpen(false);
            refetchKitPrefs();
        } catch (e: any) {
            notify("Error", e.message, "error");
        }
    };

    return (
        <Show when={profile()} fallback={<p aria-busy="true">Loading...</p>}>
            <section class="dashboard-section active">
                <DefaultKitRequirementsPanel kitItems={kitItems() || []} userKitPrefs={userKitPrefs() || []} onOpenItem={openKitModal} />
            </section>

            <Modal isOpen={isKitModalOpen()} onClose={() => setIsKitModalOpen(false)} title={`Default ${activeKitItem()?.name}`}>
                <div class="variant-selection">
                    <p>Select your default size/variant for {activeKitItem()?.name}:</p>
                    <div class="item-list">
                        <For each={activeKitItem()?.variants || []}>
                            {(variant) => (
                                <button class="list-item clickable" onClick={() => handleSelectVariant(variant.id)}>
                                    <div class="item-details">
                                        <span class="item-title">{variant.name}</span>
                                    </div>
                                </button>
                            )}
                        </For>
                        <button class="list-item clickable" onClick={() => handleSelectVariant(null)}>
                            <div class="item-details">
                                <span class="item-title">Don't Know / Not Sure</span>
                                <span class="item-subtitle">Pick each time you join an event</span>
                            </div>
                        </button>

                        <Show when={userKitPrefs()?.some((p) => p.kit_item_id === activeKitItem()?.id)}>
                            <button
                                class="list-item clickable danger-hover"
                                onClick={() => handleSelectVariant(-1)}
                                style="margin-top: 1rem; border-color: var(--error-color);"
                            >
                                <div class="item-details">
                                    <span class="item-title" style="color: var(--error-color);">
                                        Remove Default Preference
                                    </span>
                                </div>
                            </button>
                        </Show>
                    </div>
                </div>
            </Modal>
        </Show>
    );
}

function BalancePanelsSection() {
    const { notify } = useNotifications();
    const context = useProfile();
    const profile = () => context?.profile();

    const [transactions, { refetch: refetchTransactions }] = createResource(async () => {
        const res = await apiRequest("GET", "/api/user/elements/transactions");
        return (res.transactions || []) as Transaction[];
    });

    const [globals] = createResource(async () => {
        try {
            const minMoneyRes = await apiRequest("GET", "/api/globals/MinMoney").catch(() => ({ res: { MinMoney: { data: -25 } } }));
            return {
                minMoney: Number(minMoneyRes.res?.MinMoney?.data || -25)
            };
        } catch {
            return { minMoney: -25 };
        }
    });

    const [isTopUpModalOpen, setIsTopUpModalOpen] = createSignal(false);
    const [topUpAmount, setTopUpAmount] = createSignal("");
    const [isSubmittingTopUp, setIsSubmittingTopUp] = createSignal(false);

    const handleTopUpSubmit = async (e: Event) => {
        e.preventDefault();
        const amount = parseFloat(topUpAmount());
        if (isNaN(amount) || amount <= 0) {
            notify("Error", "Please enter a valid amount.", "error");
            return;
        }

        setIsSubmittingTopUp(true);
        try {
            await apiRequest("POST", "/api/user/topup-request", { amount, description: "Bank Transfer" });
            notify("Success", "Top-up request submitted! Admin will verify soon.", "success");
            setIsTopUpModalOpen(false);
            setTopUpAmount("");
            refetchTransactions();
        } catch (err: any) {
            notify("Error", err.message || "Failed to submit request.", "error");
        } finally {
            setIsSubmittingTopUp(false);
        }
    };

    return (
        <Show when={profile()} fallback={<p aria-busy="true">Loading...</p>}>
            <section class="dashboard-section active">
                <CurrentBalancePanel profile={profile()!} minMoney={globals()?.minMoney || -25} onReportTopUp={() => setIsTopUpModalOpen(true)} />

                <div class="grid">
                    <HowToTopUpPanel profile={profile()!} />
                </div>

                <TransactionHistoryPanel transactions={transactions() || []} />
            </section>

            <Modal isOpen={isTopUpModalOpen()} onClose={() => setIsTopUpModalOpen(false)} title="Report Bank Transfer">
                <form onSubmit={handleTopUpSubmit} class="modern-form">
                    <p>Have you already sent the transfer? Let us know the amount so we can verify it faster.</p>

                    <div class="form-group">
                        <label>
                            Amount Transferred (£)
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={topUpAmount()}
                                onInput={(e) => setTopUpAmount(e.currentTarget.value)}
                                placeholder="0.00"
                                required
                                autofocus
                            />
                        </label>
                    </div>

                    <div class="liquid-container secondary-bg" style={{ "font-size": "0.85rem" }}>
                        <p class="m-0">
                            <strong>Note:</strong> Your balance will update once a treasurer confirms the receipt of funds in the club bank account.
                            You'll receive an email receipt once verified.
                        </p>
                    </div>

                    <div class="form-actions" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 2rem;">
                        <button type="button" class="secondary" onClick={() => setIsTopUpModalOpen(false)}>
                            Cancel
                        </button>
                        <button type="submit" class="primary" disabled={isSubmittingTopUp()}>
                            {isSubmittingTopUp() ? "Submitting..." : "Confirm Report"}
                        </button>
                    </div>
                </form>
            </Modal>
        </Show>
    );
}

function SettingsPanelsSection() {
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const context = useProfile();
    const profile = () => context?.profile();
    const refetch = () => context?.refetch();

    const [isSubscribing, setIsSubscribing] = createSignal(false);
    const [isUnsubscribing, setIsUnsubscribing] = createSignal(false);
    const [notificationPermission, setNotificationPermission] = createSignal<NotificationPermission | 'unsupported'>(
        typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
    );

    const refreshPushState = async () => {
        if (typeof Notification === 'undefined') {
            setNotificationPermission('unsupported');
            return;
        }

        setNotificationPermission(Notification.permission);

        if (!('serviceWorker' in navigator)) {
            setIsSubscribed(false);
            return;
        }

        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            setIsSubscribed(!!sub);
        } catch {
            setIsSubscribed(false);
        }
    };

    onMount(() => {
        refreshPushState();

        const handleFocus = () => {
            refreshPushState();
        };

        window.addEventListener('focus', handleFocus);
        onCleanup(() => window.removeEventListener('focus', handleFocus));
    });

    const handleSubscribe = async () => {
        setIsSubscribing(true);
        const success = await subscribeToNotifications();
        setIsSubscribing(false);
        if (success) {
            notify("Success", "You are now subscribed to push notifications!", "success");
        } else {
            notify("Error", "Failed to subscribe. Please check browser permissions.", "error");
        }
        await refreshPushState();
    };

    const handleUnsubscribe = async () => {
        setIsUnsubscribing(true);
        const success = await unsubscribeFromNotifications();
        setIsUnsubscribing(false);
        if (success) {
            notify("Success", "You have unsubscribed from push notifications.", "success");
        } else {
            notify("Error", "Failed to unsubscribe.", "error");
        }
        await refreshPushState();
    };

    const [isTOTPModalOpen, setIsTOTPModalOpen] = createSignal(false);
    const [totpSetup, setTOTPSetup] = createSignal<{ qrCodeData: string; secret: string } | null>(null);

    const handleSetupTOTP = async () => {
        notify("Info", "Preparing TOTP setup...", "info", 5000, "totp-setup");
        try {
            const data = await apiRequest("GET", "/api/auth/totp/setup");
            setTOTPSetup(data);
            setIsTOTPModalOpen(true);
            notify("Success", "TOTP setup ready.", "success", 3000, "totp-setup");
        } catch {
            notify("Error", "Failed to start setup.", "error", 5000, "totp-setup");
        }
    };

    const handleVerifyTOTP = async (e: Event) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const token = formData.get("totp-code") as string;

        if (!token) {
            notify("Error", "Please enter the verification code.", "error");
            return;
        }

        notify("Info", "Verifying code...", "info", 5000, "totp-verify");
        try {
            await apiRequest("POST", "/api/auth/totp/enable", { token });
            notify("Success", "TOTP enabled!", "success", 3000, "totp-verify");
            setIsTOTPModalOpen(false);
            refetch();
        } catch (err: any) {
            notify("Error", err.message, "error", 5000, "totp-verify");
        }
    };

    const handleDisableTOTP = async () => {
        if (await showConfirmModal("Disable 2FA?", "Are you sure? This will make your account less secure.")) {
            notify("Info", "Disabling TOTP...", "info", 5000, "totp-disable");
            try {
                await apiRequest("POST", "/api/auth/totp/disable");
                notify("Success", "TOTP disabled.", "success", 3000, "totp-disable");
                refetch();
            } catch (err: any) {
                notify("Error", err.message, "error", 5000, "totp-disable");
            }
        }
    };

    const handleToggleEmail2FA = async () => {
        const currentlyEnabled = profile()?.email_2fa_enabled;
        const action = currentlyEnabled ? "disable" : "enable";

        if (currentlyEnabled) {
            if (!(await showConfirmModal("Disable Email 2FA?", "Are you sure? This will make your account less secure."))) return;
        }

        notify("Info", `${currentlyEnabled ? "Disabling" : "Enabling"} Email 2FA...`, "info", 5000, "email-2fa-toggle");
        try {
            await apiRequest("POST", `/api/auth/email-2fa/${action}`);
            notify("Success", `Email 2FA ${currentlyEnabled ? "disabled" : "enabled"}.`, "success", 3000, "email-2fa-toggle");
            refetch();
        } catch (err: any) {
            notify("Error", err.message, "error", 5000, "email-2fa-toggle");
        }
    };

    const [notificationSettings, { refetch: refetchNotificationSettings }] = createResource(async () => {
        try {
            return await apiRequest("GET", "/api/notifications/settings");
        } catch {
            return null;
        }
    });

    const handleToggleNotification = async (key: string) => {
        const current = notificationSettings();
        if (!current) return;

        const newData = { ...current, [key]: !current[key] };
        try {
            await apiRequest("POST", "/api/notifications/settings", newData);
            notify("Success", "Preferences updated.", "success", 2000);
            refetchNotificationSettings();
        } catch {
            notify("Error", "Failed to update preferences.", "error");
        }
    };

    const [isPasskeyModalOpen, setIsPasskeyModalOpen] = createSignal(false);
    const [passkeys, { refetch: refetchPasskeys }] = createResource(async () => {
        return await apiRequest("GET", "/api/auth/passkeys");
    });

    const handleAddPasskey = async () => {
        notify("Info", "Registering passkey...", "info", 5000, "passkey-add");
        try {
            const options = await apiRequest("GET", "/api/auth/passkey/register-options");
            const attResp = await SimpleWebAuthnBrowser.startRegistration(options);
            await apiRequest("POST", "/api/auth/passkey/register-verify", attResp);
            notify("Success", "Passkey registered!", "success", 3000, "passkey-add");
            refetchPasskeys();
        } catch (err: any) {
            if (err.name === "NotAllowedError" || err.name === "AbortError") {
                notify("Warning", "Registration cancelled.", "warning", 3000, "passkey-add");
                return;
            }
            notify("Error", err.message, "error", 5000, "passkey-add");
        }
    };

    const handleDeletePasskey = async (id: string) => {
        if (await showConfirmModal("Delete Passkey?", "Are you sure?")) {
            notify("Info", "Removing passkey...", "info", 5000, "passkey-delete");
            try {
                await apiRequest("DELETE", `/api/auth/passkeys/${id}`);
                notify("Success", "Passkey removed.", "success", 3000, "passkey-delete");
                refetchPasskeys();
            } catch {
                notify("Error", "Failed to delete passkey.", "error", 5000, "passkey-delete");
            }
        }
    };

    const [calendarToken, setCalendarToken] = createSignal<string | null>(null);
    const [isGeneratingToken, setIsGeneratingToken] = createSignal(false);

    const ensureCalendarToken = async () => {
        if (calendarToken()) return calendarToken();
        setIsGeneratingToken(true);
        try {
            const data = await apiRequest("POST", "/api/calendar/token");
            setCalendarToken(data.token);
            return data.token;
        } catch {
            notify("Error", "Failed to generate calendar token.", "error");
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
        notify("Success", `${label} copied to clipboard!`, "success", 2000);
    };

    const handleSubscribeCalendar = async (path: string) => {
        const token = await ensureCalendarToken();
        if (!token) return;

        const url = `${window.location.origin.replace(/^https?:\/\//, "webcal://")}/api/calendar/${path}/${token}.ics`;
        window.open(url, "_self");
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        notify("Success", `${label} copied to clipboard!`, "success", 2000);
    };

    const [userEmails, { refetch: refetchEmails }] = createResource(async () => {
        return await apiRequest("GET", "/api/users/me/emails");
    });

    const [isAddEmailModalOpen, setIsAddEmailModalOpen] = createSignal(false);
    const [isAddingEmail, setIsAddingEmail] = createSignal(false);
    const handleAddEmail = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const email = new FormData(form).get("new-email") as string;

        setIsAddingEmail(true);
        try {
            await apiRequest("POST", "/api/users/me/emails", { email });
            notify("Success", "Verification email sent.", "success");
            form.reset();
            setIsAddEmailModalOpen(false);
            refetchEmails();
        } catch (err: any) {
            notify("Error", err.message, "error");
        } finally {
            setIsAddingEmail(false);
        }
    };

    const handleResendEmailVerification = async (id: number) => {
        try {
            await apiRequest("POST", `/api/users/me/emails/${id}/resend`);
            notify("Success", "Verification email resent.", "success");
        } catch (err: any) {
            notify("Error", err.message || "Failed to resend verification email.", "error");
        }
    };

    const handleDeleteEmail = async (id: number) => {
        if (await showConfirmModal("Delete Email?", "Are you sure?")) {
            try {
                await apiRequest("DELETE", `/api/users/me/emails/${id}`);
                notify("Success", "Email deleted.", "success");
                refetchEmails();
            } catch (err: any) {
                notify("Error", err.message, "error");
            }
        }
    };

    const handleSetPrimary = async (id: number) => {
        try {
            await apiRequest("POST", `/api/users/me/emails/${id}/set-primary`);
            notify("Success", "Primary email updated.", "success");
            refetchEmails();
            refetch();
        } catch (err: any) {
            notify("Error", err.message, "error");
        }
    };

    return (
        <Show when={profile()} fallback={<p aria-busy="true">Loading...</p>}>
            <section class="dashboard-section active">
                <EmailAddressesPanel
                    emails={userEmails() || []}
                    onOpenAddEmail={() => setIsAddEmailModalOpen(true)}
                    onResendVerification={handleResendEmailVerification}
                    onSetPrimary={handleSetPrimary}
                    onDelete={handleDeleteEmail}
                />

                <AccountSecurityPanel
                    totpEnabled={!!profile()?.totp_enabled}
                    email2FAEnabled={!!profile()?.email_2fa_enabled}
                    passkeyCount={passkeys()?.length || 0}
                    onChangePassword={async () => {
                        const passwords = await showChangePasswordModal(profile()?.email);
                        if (passwords) {
                            try {
                                await apiRequest("POST", "/api/auth/change-password", passwords);
                                notify("Success", "Password changed.", "success");
                            } catch (err: any) {
                                notify("Error", err.message || "Failed to change password.", "error");
                            }
                        }
                    }}
                    onSetupTOTP={handleSetupTOTP}
                    onDisableTOTP={handleDisableTOTP}
                    onToggleEmail2FA={handleToggleEmail2FA}
                    onOpenPasskeys={() => setIsPasskeyModalOpen(true)}
                    onDeleteAccount={async () => {
                        const password = await showPasswordModal("Delete Account", "This cannot be undone.");
                        if (password) {
                            try {
                                await apiRequest("POST", "/api/user/deleteAccount", { password });
                                LoginEvent.notify({ authenticated: false });
                                navigate("/home");
                            } catch {
                                notify("Error", "Delete failed.", "error");
                            }
                        }
                    }}
                />

                <NotificationPreferencesPanel settings={notificationSettings()} onToggle={handleToggleNotification} />

                <CalendarIntegrationPanel
                    isGeneratingToken={isGeneratingToken()}
                    onSubscribePublic={() => {
                        const url = `${window.location.origin.replace(/^https?:\/\//, "webcal://")}/api/calendar/all.ics`;
                        window.open(url, "_self");
                    }}
                    onCopyPublic={() => copyToClipboard(`${window.location.origin}/api/calendar/all.ics`, "Public Feed URL")}
                    onSubscribePersonal={() => handleSubscribeCalendar("personal")}
                    onCopyPersonal={() => handleCopyCalendarLink("personal", "Personal Feed URL")}
                    onSubscribeAccessible={() => handleSubscribeCalendar("accessible")}
                    onCopyAccessible={() => handleCopyCalendarLink("accessible", "Accessible Feed URL")}
                />

                <AppInstallationPanel
                    isInstalled={isPWAInstalled()}
                    manualInstall={isManualInstall()}
                    hasDeferredPrompt={!!deferredPrompt()}
                    isSubscribed={isSubscribed()}
                    notificationPermission={notificationPermission()}
                    isSubscribing={isSubscribing()}
                    isUnsubscribing={isUnsubscribing()}
                    onInstall={installPWA}
                    onSubscribe={handleSubscribe}
                    onUnsubscribe={handleUnsubscribe}
                />
            </section>

            <Modal isOpen={isTOTPModalOpen()} title="Setup TOTP" onClose={() => setIsTOTPModalOpen(false)}>
                <div class="totp-setup-flow">
                    <p>Scan this QR code with your authenticator app.</p>
                    <div class="qr-container">
                        <img src={totpSetup()?.qrCodeData} alt="TOTP QR Code" />
                    </div>
                    <div class="manual-secret">
                        <span>Or enter manually:</span>
                        <div class="secret-row">
                            <code>{totpSetup()?.secret}</code>
                            <button onClick={() => navigator.clipboard.writeText(totpSetup()?.secret || "")}>
                                <FaSolidCopy />
                            </button>
                        </div>
                    </div>
                    <form onSubmit={handleVerifyTOTP} class="modern-form">
                        <label>
                            Verification Code <input type="text" id="totp-code" name="totp-code" placeholder="123456" required />
                        </label>
                        <button type="submit" class="primary full-width">
                            Verify & Enable
                        </button>
                    </form>
                </div>
            </Modal>

            <Modal isOpen={isAddEmailModalOpen()} title="Add Email Address" onClose={() => setIsAddEmailModalOpen(false)}>
                <form onSubmit={handleAddEmail} class="modern-form">
                    <label>
                        Email Address
                        <input name="new-email" type="email" placeholder="name@durham.ac.uk" required disabled={isAddingEmail()} autofocus />
                    </label>
                    <div class="form-actions">
                        <button type="button" class="secondary" onClick={() => setIsAddEmailModalOpen(false)} disabled={isAddingEmail()}>
                            Cancel
                        </button>
                        <button type="submit" class="primary" disabled={isAddingEmail()}>
                            {isAddingEmail() ? "Adding..." : "Add Email"}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isPasskeyModalOpen()} title="Manage Passkeys" onClose={() => setIsPasskeyModalOpen(false)}>
                <div class="passkey-management">
                    <div class="item-list">
                        <For each={passkeys() || []} fallback={<p>No passkeys registered.</p>}>
                            {(k) => (
                                <div class="list-item">
                                    <div class="item-icon">
                                        <FaSolidKey />
                                    </div>
                                    <div class="item-details">
                                        <span class="item-title">Passkey</span>
                                        <span class="item-subtitle">Added {new Date(k.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div class="item-value-group">
                                        <button class="small-btn icon-only delete" onClick={() => handleDeletePasskey(k.id)}>
                                            <FaSolidXmark />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                    <button class="primary full-width" onClick={handleAddPasskey}>
                        <FaSolidPlus /> Add Passkey
                    </button>
                </div>
            </Modal>
        </Show>
    );
}

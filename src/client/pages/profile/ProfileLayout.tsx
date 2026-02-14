import { ParentProps, createContext, useContext, createResource, onMount, onCleanup } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import { apiRequest, clearApiCache } from "@/utils/api";
import { useAuth } from "@/stores/auth";
import { LoginEvent, ProfilePictureChangedEvent } from "@/utils/events/events";
import { onUpdate } from "@/utils/updates";
import { TabNav } from "@/widgets/TabNav";
import { DASHBOARD_SVG, GROUP_SVG, KAYAKING_SVG, WALLET_SVG, SETTINGS_SVG, LOGOUT_SVG, ARROW_BACK_IOS_NEW_SVG } from '@/utils/icons';
import { UserProfile } from "./types";

interface ProfileContextType {
    profile: () => UserProfile | undefined;
    refetch: () => void;
}

const ProfileContext = createContext<ProfileContextType>();

export function useProfile() {
    return useContext(ProfileContext);
}

export default function ProfileLayout(props: ParentProps) {
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

    return (
        <ProfileContext.Provider value={{ profile, refetch }}>
            <div id="profile-view" class="view">
                <div class="dashboard-container">
                    <aside class="dashboard-sidebar">
                        <TabNav class="vertical-sidebar liquid-container">
                            <button class="nav-item" onClick={() => navigate('/home')}>
                                <span innerHTML={ARROW_BACK_IOS_NEW_SVG} /> Back to Home
                            </button>
                            <div class="sidebar-spacer" style={{"border-top": "1px solid rgba(var(--pico-color-rgb), 0.1)", "margin": "0.5rem 0"}} />
                            
                            <button class="nav-item" classList={{ active: isActive('/profile') }} onClick={() => navigate('/profile')}>
                                <span innerHTML={DASHBOARD_SVG} /> Overview
                            </button>
                            <button class="nav-item" classList={{ active: isActive('/profile/cars') }} onClick={() => navigate('/profile/cars')}>
                                <span innerHTML={GROUP_SVG} /> Cars
                            </button>
                            <button class="nav-item" classList={{ active: isActive('/profile/kit') }} onClick={() => navigate('/profile/kit')}>
                                <span innerHTML={KAYAKING_SVG} /> Kit
                            </button>
                            <button class="nav-item" classList={{ active: isActive('/profile/balance') }} onClick={() => navigate('/profile/balance')}>
                                <span innerHTML={WALLET_SVG} /> Balance
                            </button>
                            <button class="nav-item" classList={{ active: isActive('/profile/settings') }} onClick={() => navigate('/profile/settings')}>
                                <span innerHTML={SETTINGS_SVG} /> Settings
                            </button>
                            <div class="sidebar-spacer"></div>
                            <button class="nav-item logout" onClick={handleLogout}>
                                <span innerHTML={LOGOUT_SVG} /> Sign Out
                            </button>
                        </TabNav>
                    </aside>

                    <main class="dashboard-content">
                        {props.children}
                    </main>
                </div>
            </div>
        </ProfileContext.Provider>
    );
}

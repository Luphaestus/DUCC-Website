// todo clean up
import { createSignal, createResource, Show, createEffect, onMount, onCleanup } from "solid-js";
import { unwrap } from "solid-js/store";
import { useParams, useNavigate, useSearchParams } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import Avatar from "@/components/Avatar";
import {
    PERSON_SVG, SHIELD_SVG, ID_CARD_SVG,
    WALLET_SVG, POOL_SVG, DASHBOARD_SVG, UPLOAD_SVG
} from '@/utils/icons';
import ProfileTab from "./tabs/ProfileTab";
import OverviewTab from "./tabs/OverviewTab";
import AccessTab from "./tabs/AccessTab";
import TransactionsTab from "./tabs/TransactionsTab";
import SwimsTab from "./tabs/SwimsTab";
import Panel from "@/components/Panel";
import { TabNav } from "@/widgets/TabNav";
import { onUpdate } from "@/utils/updates";
import { UploadWidget } from "@/widgets/upload/UploadWidget";
import { useNotifications } from "@/stores/notifications";
import { ProfilePictureChangedEvent } from "@/utils/events/events";
import PageTitle from "@/components/PageTitle";
import { ARROW_BACK_IOS_NEW_SVG } from "@/utils/icons";

export default function UserDetailPage() {
    const { notify } = useNotifications();
    const params = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const userId = () => params.id ? parseInt(params.id) : null;

    const [user, { refetch }] = createResource(userId, async (id) => {
        if (id === null || isNaN(id)) return null;
        // Use a cache-buster to ensure we always get the freshest data after an update
        return await apiRequest('GET', `/api/admin/user/${id}?t=${Date.now()}`);
    });

    const [viewerPerms] = createResource(async () => {
        const res = await apiRequest('GET', '/api/user/elements/permissions').catch(() => ({}));
        return (res.permissions || []) as string[];
    });

    const canManageUsers = () => viewerPerms()?.includes('user.manage') || viewerPerms()?.includes('user.read');
    const canManageTransactions = () => viewerPerms()?.includes('transaction.manage') || viewerPerms()?.includes('transaction.read');
    const canManageSwims = () => viewerPerms()?.includes('swims.manage') || viewerPerms()?.includes('swims.read');
    const isExec = () => (viewerPerms()?.length || 0) > 0;

    const [stats, { refetch: refetchStats }] = createResource(
        () => ({ id: userId(), can: canManageTransactions() }),
        async ({ id, can }) => {
            if (!id || isNaN(id) || !can) return null;
            try {
                return await apiRequest('GET', `/api/admin/stats/user/${id}`);
            } catch { return null; }
        }
    );

    const [globals] = createResource(async () => {
        try {
            const res = await apiRequest('GET', '/api/globals/MinMoney');
            return {
                minMoney: Number(res.res?.MinMoney?.data || -25)
            };
        } catch {
            return { minMoney: -25 };
        }
    });

    let uploadWidget: UploadWidget | null = null;

    onMount(() => {
        const cleanup = onUpdate((event) => {
            const currentId = userId();
            if ((event.type === 'balance_update' || event.type === 'attendance_update') && currentId && Number(event.data.userId) === currentId) {
                refetch();
                refetchStats();
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

    createEffect(() => {
        const currentId = userId();
        if (currentId) {
            uploadWidget = new UploadWidget(`admin-avatar-upload-container`, {
                mode: 'inline',
                enableLibrary: false,
                enableUrl: false,
                showActions: false,
                showPreview: false,
                enableCrop: true,
                onImageSelect: async ({ id }) => {
                    if (!id) return;
                    try {
                        await apiRequest('POST', `/api/admin/user/${currentId}/elements`, { profile_picture_id: id });
                        notify('Success', 'Profile picture overridden.', 'success');
                        ProfilePictureChangedEvent.notify();
                        await refetch();
                    } catch (err: any) {
                        notify('Error', err.message, 'error');
                    }
                }
            });
        }
    });

    const currentTab = () => (searchParams.tab as string) || 'overview';

    return (
        <>
            <div id="admin-avatar-upload-container" style="display: none;"></div>
            <Show when={user()} fallback=
                {
                    <p aria-busy="true" class="loading-text">Loading user details...</p>
                }>
                {(u: any) => {
                    const userData = () => typeof u === 'function' ? u() : u;
                    return (
                        <div class="dashboard-container">
                            <aside class="dashboard-sidebar">
                                <div class="liquid-container user-identity-card mb-4" style={{ "--liquid-padding": "1.5rem", "display": "flex", "align-items": "center", "gap": "1rem" }}>
                                    <div class="profile-picture-container clickable" style={{ "width": "64px", "height": "64px", "flex-shrink": "0" }} onClick={() => uploadWidget?.inputEl.click()}>
                                        <Avatar user={userData()} classes="medium" />
                                        <div class="avatar-overlay" innerHTML={UPLOAD_SVG}></div>
                                    </div>
                                    <div class="user-info" style={{ "flex": "1", "min-width": "0" }}>
                                        <h2 class="text-lg m-0" style={{ "white-space": "nowrap", "overflow": "hidden", "text-overflow": "ellipsis" }}>{userData().first_name} {userData().last_name}</h2>
                                        <span class="badge neutral">ID: {userData().id}</span>
                                    </div>
                                </div>

                                <TabNav class="vertical-sidebar">
                                    <button class="nav-item" classList={{ active: currentTab() === 'overview' }} onClick={() => setSearchParams({ tab: 'overview' })}>
                                        <span innerHTML={DASHBOARD_SVG} /> Overview
                                    </button>
                                    <button class="nav-item" classList={{ active: currentTab() === 'profile' }} onClick={() => setSearchParams({ tab: 'profile' })}>
                                        <span innerHTML={PERSON_SVG} /> Account Details
                                    </button>                                <Show when={canManageUsers()}>
                                        <button class="nav-item" classList={{ active: currentTab() === 'access' }} onClick={() => setSearchParams({ tab: 'access' })}>
                                            <span innerHTML={SHIELD_SVG} /> Access
                                        </button>
                                    </Show>
                                    <Show when={canManageTransactions()}>
                                        <button class="nav-item" classList={{ active: currentTab() === 'transactions' }} onClick={() => setSearchParams({ tab: 'transactions' })}>
                                            <span innerHTML={WALLET_SVG} /> Finance
                                        </button>
                                    </Show>
                                </TabNav>
                            </aside>

                            <main class="dashboard-content">
                                <div class="flex justify-between align-center mb-4">
                                    <button class="small-btn secondary outline" onClick={() => navigate('/admin/users')}>
                                        <span innerHTML={ARROW_BACK_IOS_NEW_SVG} /> Back
                                    </button>
                                </div>
                                <PageTitle text={`${userData().first_name} ${userData().last_name}`} centered={true} />
                                <div class="mt-6">
                                    <Show when={currentTab() === 'overview'}>
                                    <OverviewTab
                                        user={userData()}
                                        stats={stats()}
                                        minMoney={globals()?.minMoney ?? -25}
                                        permissions={viewerPerms() || []}
                                        refetchUser={refetch}
                                    />
                                </Show>                                                <Show when={currentTab() === 'profile'}>
                                    <ProfileTab user={userData()} permissions={viewerPerms() || []} canManageUsers={canManageUsers() || false} isExec={isExec()} refetchUser={refetch} />
                                </Show>                            <Show when={currentTab() === 'access'}>
                                    <AccessTab user={userData()} refetchUser={refetch} />
                                </Show>
                                <Show when={currentTab() === 'transactions'}>
                                    <TransactionsTab userId={userData().id} />
                                </Show>
                                </div>
                            </main>
                        </div>
                    );
                }}
            </Show>
        </>
    );
}

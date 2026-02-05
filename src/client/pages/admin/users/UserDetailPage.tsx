import { createSignal, createResource, Show, createEffect, onMount, onCleanup } from "solid-js";
import { useParams, useNavigate, useSearchParams } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import Avatar from "@/components/Avatar";
import {
    BOLT_SVG, SHIELD_SVG, ID_CARD_SVG, KAYAKING_SVG,
    WALLET_SVG, POOL_SVG
} from '@/utils/icons';
import ProfileTab from "./tabs/ProfileTab";
import LegalTab from "./tabs/LegalTab";
import TagsTab from "./tabs/TagsTab";
import KitTab from "./tabs/KitTab";
import PermissionsTab from "./tabs/PermissionsTab";
import TransactionsTab from "./tabs/TransactionsTab";
import SwimsTab from "./tabs/SwimsTab";
import Panel from "@/components/Panel";
import { TabNav } from "@/widgets/TabNav";
import { onUpdate } from "@/utils/updates";

export default function UserDetailPage() {
    const params = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const userId = () => params.id ? parseInt(params.id) : null;

    onMount(() => {
        const cleanup = onUpdate((event) => {
            const currentId = userId();
            if ((event.type === 'balance_update' || event.type === 'attendance_update') && currentId && Number(event.data.userId) === currentId) {
                refetch();
                refetchStats();
            }
        });
        onCleanup(cleanup);
    });

    const currentTab = () => (searchParams.tab as string) || 'profile';

    const [user, { refetch }] = createResource(userId, async (id) => {
        if (id === null || isNaN(id)) return null;
        return await apiRequest('GET', `/api/admin/user/${id}`);
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

    return (
        <Show when={user()} fallback={<p aria-busy="true" class="loading-text">Loading user details...</p>}>
            {(u: any) => (
                <div class="dashboard-container">
                    <aside class="dashboard-sidebar">
                        <div class="user-identity-card" style={{ 
                            background: "var(--glass-bg)", 
                            border: "var(--glass-border)", 
                            padding: "1.5rem", 
                            "border-radius": "var(--border-radius-lg)",
                            display: "flex",
                            "flex-direction": "column",
                            "align-items": "center",
                            gap: "1rem",
                            "backdrop-filter": "blur(12px)",
                            "margin-bottom": "1rem"
                        }}>
                            <Avatar user={u} classes="large" />
                            <div class="user-info" style={{ "text-align": "center" }}>
                                <h2 style={{ margin: 0, "font-size": "1.25rem" }}>{u.first_name} {u.last_name}</h2>
                                <span class="badge neutral">ID: {u.id}</span>
                            </div>
                        </div>

                        <TabNav class="vertical-sidebar">
                            <button class="nav-item" classList={{ active: currentTab() === 'profile' }} onClick={() => setSearchParams({ tab: 'profile' })}>
                                <span innerHTML={BOLT_SVG} /> Profile
                            </button>
                            <Show when={canManageUsers()}>
                                <button class="nav-item" classList={{ active: currentTab() === 'legal' }} onClick={() => setSearchParams({ tab: 'legal' })}>
                                    <span innerHTML={SHIELD_SVG} /> Legal
                                </button>
                                <button class="nav-item" classList={{ active: currentTab() === 'tags' }} onClick={() => setSearchParams({ tab: 'tags' })}>
                                    <span innerHTML={ID_CARD_SVG} /> Tags
                                </button>
                                <button class="nav-item" classList={{ active: currentTab() === 'kit' }} onClick={() => setSearchParams({ tab: 'kit' })}>
                                    <span innerHTML={KAYAKING_SVG} /> Kit
                                </button>
                                <button class="nav-item" classList={{ active: currentTab() === 'permissions' }} onClick={() => setSearchParams({ tab: 'permissions' })}>
                                    <span innerHTML={SHIELD_SVG} /> Permissions
                                </button>
                            </Show>
                            <Show when={canManageTransactions()}>
                                <button class="nav-item" classList={{ active: currentTab() === 'transactions' }} onClick={() => setSearchParams({ tab: 'transactions' })}>
                                    <span innerHTML={WALLET_SVG} /> Finance
                                </button>
                            </Show>
                            <Show when={canManageSwims()}>
                                <button class="nav-item" classList={{ active: currentTab() === 'swims' }} onClick={() => setSearchParams({ tab: 'swims' })}>
                                    <span innerHTML={POOL_SVG} /> Swims
                                </button>
                            </Show>
                        </TabNav>
                    </aside>

                    <main class="dashboard-content">
                        <Show when={stats() && currentTab() === 'profile'}>
                            <div class="stats-grid" style={{ "margin-bottom": "0rem" }}>
                                <div class="stat-item">
                                    <span class="stat-value">£{stats().finance.year_spent.toFixed(2)}</span>
                                    <span class="stat-label">Spent (Year)</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value">£{stats().finance.total_spent.toFixed(2)}</span>
                                    <span class="stat-label">Spent (Total)</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value">{stats().attendance.year_events}</span>
                                    <span class="stat-label">Events (Year)</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value">{stats().attendance.total_events}</span>
                                    <span class="stat-label">Events (Total)</span>
                                </div>
                            </div>
                        </Show>

                        <Show when={currentTab() === 'profile'}>
                            <ProfileTab user={u} permissions={viewerPerms() || []} canManageUsers={canManageUsers() || false} isExec={isExec()} refetchUser={refetch} />
                        </Show>
                        <Show when={currentTab() === 'legal'}>
                            <LegalTab user={u} />
                        </Show>
                        <Show when={currentTab() === 'tags'}>
                            <TagsTab userId={u.id} />
                        </Show>
                        <Show when={currentTab() === 'kit'}>
                            <KitTab userId={u.id} />
                        </Show>
                        <Show when={currentTab() === 'permissions'}>
                            <PermissionsTab user={u} refetchUser={refetch} />
                        </Show>
                        <Show when={currentTab() === 'transactions'}>
                            <TransactionsTab userId={u.id} />
                        </Show>
                        <Show when={currentTab() === 'swims'}>
                            <SwimsTab user={u} />
                        </Show>
                    </main>
                </div>
            )}
        </Show>
    );
}

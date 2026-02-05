import { createSignal, createResource, Show, createEffect, onMount, onCleanup } from "solid-js";
import { useParams, useNavigate, useSearchParams } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import Avatar from "@/components/Avatar";
import ProfileTab from "./tabs/ProfileTab";
import LegalTab from "./tabs/LegalTab";
import TagsTab from "./tabs/TagsTab";
import TransactionsTab from "./tabs/TransactionsTab";
import SwimsTab from "./tabs/SwimsTab";
import Panel from "@/components/Panel";
import { TabNav } from "@/widgets/TabNav";
import { onUpdate } from "@/utils/updates";

export default function UserDetailPage() {
    const params = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const userId = () => parseInt(params.id || '0');

    onMount(() => {
        const cleanup = onUpdate((event) => {
            if ((event.type === 'balance_update' || event.type === 'attendance_update') && Number(event.data.userId) === userId()) {
                refetch();
                refetchStats();
            }
        });
        onCleanup(cleanup);
    });

    const currentTab = () => (searchParams.tab as string) || 'profile';

    const [user, { refetch }] = createResource(userId, async (id) => {
        return await apiRequest('GET', `/api/admin/user/${id}`);
    });

    const [viewerPerms] = createResource(async () => {
        const res = await apiRequest('GET', '/api/user/elements/permissions').catch(() => ({}));
        return (res.permissions || []) as string[];
    });

    const canManageUsers = () => viewerPerms()?.includes('user.manage');
    const canManageTransactions = () => viewerPerms()?.includes('transaction.manage');
    const canManageSwims = () => viewerPerms()?.includes('swims.manage');
    const isExec = () => (viewerPerms()?.length || 0) > 0;

    const [stats, { refetch: refetchStats }] = createResource(userId, async (id) => {
        if (!canManageTransactions()) return null;
        try {
            return await apiRequest('GET', `/api/admin/stats/user/${id}`);
        } catch { return null; }
    });

    return (
        <Show when={user()} fallback={<p>Loading user details...</p>}>
            {(u: any) => (
                <Panel class="detail-card">
                    <header>
                        <div class="user-identity" style={{ display: "flex", "align-items": "center", gap: "1rem" }}>
                            <Avatar user={u} classes="medium" />
                            <div class="user-info">
                                <h2 class="user-name-header" style={{ margin: 0, "font-size": "1.5rem" }}>{u.first_name} {u.last_name}</h2>
                                <span class="user-id-badge" style={{ "font-size": "0.8rem", opacity: 0.7 }}>ID: {u.id}</span>
                            </div>
                        </div>
                        
                        <div style={{ "margin-left": "auto" }}>
                            <TabNav class="tab-nav-simple">
                                <button class={`tab-btn ${currentTab() === 'profile' ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'profile' })}>Profile</button>
                                <Show when={canManageUsers()}>
                                    <button class={`tab-btn ${currentTab() === 'legal' ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'legal' })}>Legal</button>
                                    <button class={`tab-btn ${currentTab() === 'tags' ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'tags' })}>Tags</button>
                                </Show>
                                <Show when={canManageTransactions()}>
                                    <button class={`tab-btn ${currentTab() === 'transactions' ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'transactions' })}>Transactions</button>
                                </Show>
                                <Show when={canManageSwims()}>
                                    <button class={`tab-btn ${currentTab() === 'swims' ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'swims' })}>Swims</button>
                                </Show>
                            </TabNav>
                        </div>
                    </header>

                    <div class="card-body">
                        <Show when={stats() && currentTab() === 'profile'}>
                            <div class="stats-grid-small" style={{ "margin-bottom": "2rem" }}>
                                <div class="stat-item">
                                    <span class="stat-val">£{stats().finance.year_spent.toFixed(2)}</span>
                                    <span class="stat-lbl">Spent (Year)</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-val">£{stats().finance.total_spent.toFixed(2)}</span>
                                    <span class="stat-lbl">Spent (Total)</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-val">{stats().attendance.year_events}</span>
                                    <span class="stat-lbl">Events (Year)</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-val">{stats().attendance.total_events}</span>
                                    <span class="stat-lbl">Events (Total)</span>
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
                        <Show when={currentTab() === 'transactions'}>
                            <TransactionsTab userId={u.id} />
                        </Show>
                        <Show when={currentTab() === 'swims'}>
                            <SwimsTab user={u} />
                        </Show>
                    </div>
                </Panel>
            )}
        </Show>
    );
}

import { createSignal, createResource, onMount, For, Show, createMemo } from "solid-js";
import { apiRequest } from "@/utils/api";
import { SOCIAL_LEADERBOARD_SVG, TROPHY_SVG, CROWN_SVG, POOL_SVG } from '@/utils/icons';
import Avatar from "@/components/Avatar";
import { useNavigate } from "@solidjs/router";

interface LeaderboardUser {
    id: number;
    first_name: string;
    last_name: string;
    swims: number;
    booties: number;
    rank: number;
    is_me: boolean;
    image_url?: string;
}

export default function SwimsPage() {
    const navigate = useNavigate();
    const [isYearly, setIsYearly] = createSignal(true);
    const [canManage, setCanManage] = createSignal(false);

    const [leaderboard] = createResource(isYearly, async (yearly) => {
        const res = await apiRequest('GET', `/api/user/swims/leaderboard?yearly=${yearly}`);
        return res.data as LeaderboardUser[];
    });

    onMount(async () => {
        try {
            const userRes = await apiRequest('GET', '/api/user/elements/permissions').catch(() => ({ permissions: [] }));
            setCanManage(userRes.permissions?.includes('swims.manage') || false);
        } catch (e) {}
    });

    const getBootieClass = (swims: number, booties: number) => {
        const delta = swims - booties;
        if (delta <= 0) return 'bootie-green';
        if (delta <= 5) return 'bootie-yellow';
        return 'bootie-red';
    };

    const podiumData = createMemo(() => {
        const data = leaderboard() || [];
        const top3 = data.slice(0, 3);
        // Logical order: [Gold (rank 1), Silver (rank 2), Bronze (rank 3)]
        return [
            { user: top3[1], rank: 2, style: 'silver', icon: SOCIAL_LEADERBOARD_SVG },
            { user: top3[0], rank: 1, style: 'gold', icon: TROPHY_SVG },
            { user: top3[2], rank: 3, style: 'bronze', icon: SOCIAL_LEADERBOARD_SVG }
        ].filter(p => !!p.user);
    });

    const listData = createMemo(() => (leaderboard() || []).slice(3));

    return (
        <div id="swims-view" class="view">
            <div class="small-container">
                <h1>Leaderboard</h1>
                
                <div class="swims-toggle-container">
                    <div class="toggle-wrapper" classList={{ 'alltime': !isYearly() }}>
                        <div class="toggle-bg"></div>
                        <button classList={{ active: isYearly() }} onClick={() => setIsYearly(true)}>This Year</button>
                        <button classList={{ active: !isYearly() }} onClick={() => setIsYearly(false)}>All Time</button>
                    </div>
                </div>

                <Show when={canManage()}>
                    <div class="admin-leaderboard-actions">
                        <button class="small-btn primary" onClick={() => navigate('/admin/users?tab=swims')}>
                            <span innerHTML={POOL_SVG} /> Manage Swims
                        </button>
                    </div>
                </Show>

                <div id="leaderboard-content">
                    <Show when={leaderboard.loading}>
                        <p class="leaderboard-status" aria-busy="true">Loading leaderboard...</p>
                    </Show>
                    
                    <Show when={!leaderboard.loading && leaderboard()?.length === 0}>
                         <p class="leaderboard-status">No swims recorded yet!</p>
                    </Show>

                    <Show when={!leaderboard.loading && leaderboard()?.length! > 0}>
                        <div class="podium-container">
                            <For each={podiumData()}>
                                {(p) => (
                                    <div class={`podium-place ${p.style}`}>
                                        <Show when={p.rank === 1}>
                                            <div class="crown-icon" innerHTML={CROWN_SVG} />
                                        </Show>
                                        <div class="swimmer-avatar">
                                            <Avatar user={p.user!} classes="clickable" onClick={() => navigate(`/admin/user/${p.user!.id}`)} />
                                        </div>
                                        <div class="swimmer-name">{p.user!.first_name} {p.user!.is_me ? '(You)' : ''}</div>
                                        <div class="swim-count">{p.user!.swims} Swims</div>
                                        <div class="bootie-count" classList={{ [getBootieClass(p.user!.swims, p.user!.booties)]: true }}>
                                            {p.user!.booties} Booties
                                        </div>
                                        <div class="podium-step">
                                            <div class="rank-circle">{p.rank}</div>
                                            <div class="medal-icon" innerHTML={p.icon} />
                                        </div>
                                    </div>
                                )}
                            </For>
                        </div>

                        <Show when={listData().length > 0}>
                            <div class="leaderboard-container-list">
                                <div class="leaderboard-list glass-panel">
                                    <For each={listData()}>
                                        {(user) => (
                                            <div class="leaderboard-row" classList={{ highlight: user.is_me }}>
                                                <div class="rank-box">{user.rank}</div>
                                                <div class="swimmer-info">
                                                    <Avatar user={user} classes="mini" />
                                                    <span>{user.first_name} {user.last_name}</span>
                                                    <Show when={user.is_me}>
                                                        <span class="you-tag">YOU</span>
                                                    </Show>
                                                </div>
                                                <div class="swims-count-group">
                                                    <div class="swims-count">{user.swims} <span>swims</span></div>
                                                    <div class="booties-count" classList={{ [getBootieClass(user.swims, user.booties)]: true }}>
                                                        {user.booties} <span>booties</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </div>
                        </Show>
                    </Show>
                </div>
            </div>
        </div>
    );
}
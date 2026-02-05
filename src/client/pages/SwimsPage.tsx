import { createSignal, createResource, onMount, For, Show, createMemo, onCleanup, batch } from "solid-js";
import { apiRequest } from "@/utils/api";
import { SOCIAL_LEADERBOARD_SVG, TROPHY_SVG, CROWN_SVG, POOL_SVG } from '@/utils/icons';
import Avatar from "@/components/Avatar";
import { useNavigate } from "@solidjs/router";
import { onUpdate } from "@/utils/updates";

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
    const [isAnimating, setIsAnimating] = createSignal(false);
    const [oldLeaderboard, setOldLeaderboard] = createSignal<LeaderboardUser[] | null>(null);

    const [leaderboard, { refetch }] = createResource(
        () => ({ yearly: isYearly() }), 
        async ({ yearly }, { value }) => {
            const res = await apiRequest('GET', `/api/user/swims/leaderboard?yearly=${yearly}`);
            
            if (value) {
                batch(() => {
                    setOldLeaderboard(value as LeaderboardUser[]);
                    setIsAnimating(true);
                });

                // Tiny delay to ensure the old-layer is painted before we switch the new-layer data
                await new Promise(r => setTimeout(r, 20));
                
                setTimeout(() => {
                    batch(() => {
                        setIsAnimating(false);
                        setOldLeaderboard(null);
                    });
                }, 400);
            }
            
            return res.data as LeaderboardUser[];
        }
    );    const getPodiumData = (data: LeaderboardUser[]) => {
        const top3 = data.slice(0, 3);
        return [
            { user: top3[1], rank: 2, style: 'silver', icon: SOCIAL_LEADERBOARD_SVG },
            { user: top3[0], rank: 1, style: 'gold', icon: TROPHY_SVG },
            { user: top3[2], rank: 3, style: 'bronze', icon: SOCIAL_LEADERBOARD_SVG }
        ].filter(p => !!p.user);
    };

    onMount(() => {
        const cleanup = onUpdate((event) => {
            if (event.type === 'swims_update') {
                refetch();
            }
        });
        onCleanup(cleanup);

        apiRequest('GET', '/api/user/elements/permissions')
            .then(userRes => {
                setCanManage(userRes.permissions?.includes('swims.manage') || false);
            })
            .catch(() => { });
    });

    const getBootieClass = (swims: number, booties: number) => {
        const delta = swims - booties;
        if (delta <= 0) return 'bootie-green';
        if (delta <= 5) return 'bootie-yellow';
        return 'bootie-red';
    };

    const podiumData = createMemo(() => getPodiumData((leaderboard() || []) as LeaderboardUser[] || []));
    const listData = createMemo(() => ((leaderboard() || []) as LeaderboardUser[] || []).slice(3));

    const oldPodiumData = createMemo(() => getPodiumData(oldLeaderboard() || []));
    const oldListData = createMemo(() => (oldLeaderboard() || []).slice(3));

    return (
        <div id="swims-view" class="view">
            <div class="small-container">
                <h1>Leaderboard</h1>

                <div class="swims-toggle-container">
                    <div class="toggle-wrapper" data-state={isYearly() ? 'yearly' : 'alltime'}>
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

                <div id="leaderboard-content" classList={{ 'is-crossfading': isAnimating() }}>
                    <Show when={leaderboard.loading && !leaderboard() && !oldLeaderboard()}>
                        <p class="leaderboard-status" aria-busy="true">Loading leaderboard...</p>
                    </Show>

                    <Show when={!leaderboard.loading && leaderboard()?.length === 0}>
                        <p class="leaderboard-status">No swims recorded yet!</p>
                    </Show>

                    <Show when={(leaderboard() && leaderboard()!.length > 0) || oldLeaderboard()}>
                        <div class="podium-container">
                            {/* Old Data Layer */}
                            <Show when={isAnimating() && oldLeaderboard()}>
                                <div class="podium-overlay old-layer">
                                    <For each={oldPodiumData()}>
                                        {(p) => (
                                            <div class={`podium-place ${p.style}`}>
                                                <div class="swimmer-avatar"><Avatar user={p.user!} classes="clickable" /></div>
                                                <div class="swimmer-name">{p.user!.first_name}</div>
                                                <div class="swim-count">{p.user!.swims} Swims</div>
                                                <div class="bootie-count" classList={{ [getBootieClass(p.user!.swims, p.user!.booties)]: true }}>{p.user!.booties} Booties</div>
                                                <div class="podium-step"><div class="rank-circle">{p.rank}</div><div class="medal-icon" innerHTML={p.icon} /></div>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </Show>

                            {/* New Data Layer */}
                            <div class="podium-overlay new-layer">
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
                        </div>

                        <div class="leaderboard-container-list">
                            <div class="leaderboard-list-track">
                                {/* Old List Layer */}
                                <Show when={isAnimating() && oldLeaderboard()}>
                                    <div class="leaderboard-list old-layer glass-panel">
                                        <For each={oldListData()}>
                                            {(user) => (
                                                <div class="leaderboard-row">
                                                    <div class="rank-box">{user.rank}</div>
                                                    <div class="swimmer-info">
                                                        <Avatar user={user} classes="mini" />
                                                        <span>{user.first_name} {user.last_name}</span>
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
                                </Show>

                                {/* New List Layer */}
                                <div class="leaderboard-list new-layer glass-panel">
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
                        </div>
                    </Show>
                </div>
            </div>
        </div>
    );
}
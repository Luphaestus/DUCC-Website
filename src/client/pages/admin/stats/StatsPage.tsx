import { createResource, For, Show, createMemo, onMount, onCleanup } from "solid-js";
import { apiRequest } from "@/utils/api";
import Panel from "@/components/Panel";
import { 
    CURRENCY_POUND_SVG, GROUP_SVG, EVENT_SVG, 
    TRENDING_UP_SVG 
} from '@/utils/icons';
import { onUpdate } from "@/utils/updates";

// Simple Bar Chart Component (SVG)
const BarChart = (props: { data: { label: string, value: number, color?: string }[], height?: number }) => {
    const height = () => props.height || 200;
    const max = createMemo(() => {
        const values = props.data?.map(d => d.value) || [];
        return Math.max(...values, 1);
    });
    const barWidth = createMemo(() => {
        const len = props.data?.length || 1;
        return 100 / len;
    });
    
    return (
        <div class="chart-container">
            <Show when={props.data && props.data.length > 0} fallback={<div class="no-data-msg">No data available</div>}>
                <svg viewBox={`0 0 100 ${height()}`} preserveAspectRatio="none" class="chart-svg">
                    <For each={props.data}>
                        {(d, i) => {
                            const h = createMemo(() => (d.value / max()) * (height() - 20));
                            const y = createMemo(() => height() - h());
                            return (
                                <g class="bar-group">
                                    <rect 
                                        x={i() * barWidth() + 1} 
                                        y={y()} 
                                        width={barWidth() - 2} 
                                        height={h()} 
                                        fill={d.color || 'var(--pico-primary)'} 
                                        rx="1"
                                    >
                                        <title>{d.label}: {d.value}</title>
                                    </rect>
                                </g>
                            );
                        }}
                    </For>
                </svg>
                <div class="chart-labels">
                    <For each={props.data}>
                        {d => <span class="chart-label">{d.label}</span>}
                    </For>
                </div>
            </Show>
        </div>
    );
};

export default function StatsPage() {
    const [financeData, { refetch: refetchFinance }] = createResource(async () => await apiRequest('GET', '/api/admin/stats/finance'));
    const [attendanceData, { refetch: refetchAttendance }] = createResource(async () => await apiRequest('GET', '/api/admin/stats/attendance'));
    const [leaderboardData, { refetch: refetchLeaderboard }] = createResource(async () => await apiRequest('GET', '/api/admin/stats/leaderboards'));

    onMount(() => {
        const cleanup = onUpdate(() => {
            refetchFinance();
            refetchAttendance();
            refetchLeaderboard();
        });
        onCleanup(cleanup);
    });

    const maxFinance = createMemo(() => {
        const monthly = financeData()?.monthly || [];
        if (monthly.length === 0) return 1;
        return Math.max(...monthly.map((m: any) => Math.max(m.income || 0, m.expense || 0)), 1);
    });

    const maxCategory = createMemo(() => {
        const categories = financeData()?.categories || [];
        if (categories.length === 0) return 1;
        return Math.max(...categories.map((c: any) => c.total || 0), 1);
    });

    const maxType = createMemo(() => {
        const types = attendanceData()?.types || [];
        if (types.length === 0) return 1;
        return Math.max(...types.map((t: any) => t.count || 0), 1);
    });

    return (
        <div class="glass-layout">
            <header class="admin-header-modern">
                <h1>Club <span class="admin-title-section">Statistics</span></h1>
            </header>

            <div class="stats-grid-dashboard">
                {/* Finance Section */}
                <Panel title="Financial Overview" icon={CURRENCY_POUND_SVG} class="full-width">
                    <div class="charts-row">
                        <div class="chart-box">
                            <h4>Monthly Income vs Expenses</h4>
                            <Show when={!financeData.loading} fallback={<p>Loading...</p>}>
                                <div class="multi-chart">
                                    <div class="legend">
                                        <span class="dot income"></span> Income
                                        <span class="dot expense"></span> Expense
                                    </div>
                                    <div class="bars-wrapper">
                                        <For each={financeData()?.monthly || []} fallback={<div class="no-data-msg">No data available</div>}>
                                            {m => (
                                                <div class="month-col">
                                                    <div class="bar income" style={{ height: `${((m.income || 0) / maxFinance()) * 130}px` }} title={`Income: £${m.income}`}></div>
                                                    <div class="bar expense" style={{ height: `${((m.expense || 0) / maxFinance()) * 130}px` }} title={`Expense: £${m.expense}`}></div>
                                                    <span class="label">{m.month?.split('-')[1] || '?'}</span>
                                                </div>
                                            )}
                                        </For>
                                    </div>
                                </div>
                            </Show>
                        </div>
                        
                        <div class="chart-box">
                            <h4>Spending by Category</h4>
                            <Show when={!financeData.loading} fallback={<p>Loading...</p>}>
                                <div class="category-list">
                                    <For each={financeData()?.categories || []} fallback={<div class="no-data-msg">No data available</div>}>
                                        {c => (
                                            <div class="cat-row">
                                                <span class="cat-name">{c.category}</span>
                                                <div class="progress-bg">
                                                    <div class="progress-fill" style={{ width: `${((c.total || 0) / maxCategory()) * 100}%` }}></div>
                                                </div>
                                                <span class="cat-val">£{(c.total || 0).toFixed(0)}</span>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </Show>
                        </div>
                    </div>
                </Panel>

                {/* Attendance Section */}
                <Panel title="Attendance Trends" icon={GROUP_SVG} class="full-width">
                    <div class="charts-row">
                        <div class="chart-box">
                            <h4>Monthly Attendance</h4>
                            <Show when={!attendanceData.loading} fallback={<p>Loading...</p>}>
                                <BarChart 
                                    data={(attendanceData()?.monthly || []).map((m: any) => ({ 
                                        label: m.month?.split('-')[1] || '?', 
                                        value: m.attendees || 0 
                                    }))} 
                                />
                            </Show>
                        </div>

                        <div class="chart-box">
                            <h4>Event Types</h4>
                            <Show when={!attendanceData.loading} fallback={<p>Loading...</p>}>
                                <div class="category-list">
                                    <For each={attendanceData()?.types || []} fallback={<div class="no-data-msg">No data available</div>}>
                                        {t => (
                                            <div class="cat-row">
                                                <span class="cat-name">{t.name}</span>
                                                <div class="progress-bg">
                                                    <div class="progress-fill" style={{ width: `${((t.count || 0) / maxType()) * 100}%` }}></div>
                                                </div>
                                                <span class="cat-val">{t.count}</span>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </Show>
                        </div>
                    </div>
                </Panel>

                {/* Leaderboards Section */}
                <div class="dual-grid">
                    <Panel title="Top Spenders (All Time)" icon={TRENDING_UP_SVG}>
                        <div class="item-list">
                            <Show when={!leaderboardData.loading} fallback={<p>Loading...</p>}>
                                <For each={leaderboardData()?.top_spenders || []} fallback={<div class="no-data-msg">No spenders yet</div>}>
                                    {u => (
                                        <div class="list-item">
                                            <div class="item-details">
                                                <span class="item-title">{u.first_name} {u.last_name}</span>
                                            </div>
                                            <div class="item-value-group">
                                                <span class="item-value">£{(u.total_spent || 0).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    )}
                                </For>
                            </Show>
                        </div>
                    </Panel>

                    <Panel title="Most Active Members" icon={EVENT_SVG}>
                        <div class="item-list">
                            <Show when={!leaderboardData.loading} fallback={<p>Loading...</p>}>
                                <For each={leaderboardData()?.most_active || []} fallback={<div class="no-data-msg">No active members yet</div>}>
                                    {u => (
                                        <div class="list-item">
                                            <div class="item-details">
                                                <span class="item-title">{u.first_name} {u.last_name}</span>
                                            </div>
                                            <div class="item-value-group">
                                                <span class="item-value">{u.event_count || 0} events</span>
                                            </div>
                                        </div>
                                    )}
                                </For>
                            </Show>
                        </div>
                    </Panel>
                </div>
            </div>
        </div>
    );
}
import { createSignal, createResource, For, Show, createMemo, onMount, onCleanup } from "solid-js";
import { Dynamic } from "solid-js/web";
import { apiRequest } from "@/utils/api";
import Panel from "@/components/Panel";
import { onUpdate } from "@/utils/updates";
import { 
    FaSolidBolt, FaSolidGaugeHigh, FaSolidDatabase, 
    FaSolidUsers, FaSolidGear 
} from 'solid-icons/fa';

// Lightweight Line Chart Component (SVG)
const LineChart = (props: { data: number[], labels: string[], color?: string, height?: number }) => {
    const height = () => props.height || 100;
    const max = createMemo(() => Math.max(...props.data, 1));
    
    const points = createMemo(() => {
        const len = props.data.length;
        if (len < 2) return "";
        return props.data.map((val, i) => {
            const x = (i / (len - 1)) * 100;
            const y = height() - (val / max()) * height();
            return `${x},${y}`;
        }).join(" ");
    });

    return (
        <div class="line-chart">
            <svg viewBox={`0 0 100 ${height()}`} preserveAspectRatio="none" style={{ width: "100%", height: `${height()}px` }}>
                <polyline
                    fill="none"
                    stroke={props.color || "var(--pico-primary)"}
                    stroke-width="2"
                    points={points()}
                    vector-effect="non-scaling-stroke"
                />
            </svg>
        </div>
    );
};

// Circular Gauge Component
const Gauge = (props: { value: number, label: string, color?: string }) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const offset = createMemo(() => circumference - (props.value / 100) * circumference);

    return (
        <div class="gauge-widget">
            <svg viewBox="0 0 100 100" class="gauge-svg">
                <circle
                    cx="50" cy="50" r={radius}
                    fill="transparent"
                    stroke="rgba(var(--pico-color-rgb), 0.1)"
                    stroke-width="8"
                />
                <circle
                    cx="50" cy="50" r={radius}
                    fill="transparent"
                    stroke={props.color || "var(--pico-primary)"}
                    stroke-width="8"
                    stroke-dasharray={circumference as any}
                    stroke-dashoffset={offset() as any}
                    stroke-linecap="round"
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                    transform="rotate(-90 50 50)"
                />
                <text x="50" y="55" text-anchor="middle" class="gauge-text" fill="currentColor">
                    {Math.round(props.value)}%
                </text>
            </svg>
            <span class="gauge-label">{props.label}</span>
        </div>
    );
};

export default function MonitoringDashboard() {
    const [liveMetrics, setLiveMetrics] = createSignal<any>(null);
    const [history, { refetch }] = createResource(async () => await apiRequest('GET', '/api/admin/stats/system?hours=6'));

    onMount(() => {
        const cleanup = onUpdate((event) => {
            if ((event.type as string) === 'system_metrics') {
                setLiveMetrics(event.data);
            }
        });
        onCleanup(cleanup);
    });

    const cpuHistory = createMemo(() => history()?.map((h: any) => h.cpu_usage) || []);
    const memHistory = createMemo(() => history()?.map((h: any) => h.memory_usage) || []);

    const [widgets, setWidgets] = createSignal([
        { id: 'cpu', title: 'CPU Usage', type: 'gauge', value: () => liveMetrics()?.cpu_usage || 0, history: cpuHistory, color: '#ff4757' },
        { id: 'mem', title: 'Memory Usage', type: 'gauge', value: () => liveMetrics()?.memory_usage || 0, history: memHistory, color: '#2ed573' },
        { id: 'db', title: 'DB Connections', type: 'stat', value: () => liveMetrics()?.db_connections || 0, icon: FaSolidDatabase },
        { id: 'sess', title: 'Active Sessions', type: 'stat', value: () => liveMetrics()?.active_sessions || 0, icon: FaSolidUsers }
    ]);

    // Simple reordering logic
    const moveWidget = (from: number, to: number) => {
        const updated = [...widgets()];
        const [moved] = updated.splice(from, 1);
        updated.splice(to, 0, moved);
        setWidgets(updated);
    };

    return (
        <div class="monitoring-dashboard">
            <header class="dashboard-header">
                <h3><FaSolidGaugeHigh /> System Monitoring</h3>
                <div class="header-actions">
                    <button class="outline contrast small-btn" onClick={() => refetch()}>Refresh History</button>
                </div>
            </header>

            <div class="metrics-grid">
                <For each={widgets()}>
                    {(w, i) => (
                        <Panel title={w.title} class="metric-widget glass-panel">
                            <div class="widget-controls">
                                <button class="icon-only mini-btn" onClick={() => moveWidget(i(), Math.max(0, i() - 1))}>←</button>
                                <button class="icon-only mini-btn" onClick={() => moveWidget(i(), Math.min(widgets().length - 1, i() + 1))}>→</button>
                            </div>
                            
                            <Show when={w.type === 'gauge'}>
                                <div class="gauge-container">
                                    <Gauge value={w.value()} label={w.title} color={w.color} />
                                    <div class="mini-chart">
                                        <Show when={w.history}>
                                            <LineChart data={w.history!()} labels={[]} color={w.color} />
                                        </Show>
                                    </div>
                                </div>
                            </Show>

                            <Show when={w.type === 'stat'}>
                                <div class="stat-container">
                                    <span class="stat-icon"><Dynamic component={w.icon} /></span>
                                    <span class="stat-value">{w.value()}</span>
                                </div>
                            </Show>
                        </Panel>
                    )}
                </For>
            </div>
        </div>
    );
}

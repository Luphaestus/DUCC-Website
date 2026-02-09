// todo clean up
import { Show } from "solid-js";
import {
    POOL_SVG, ADD_SVG, WALLET_SVG, DASHBOARD_SVG
} from '@/utils/icons';
import Panel from "@/components/Panel";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";

export default function OverviewTab(props: { user: any, stats: any, minMoney: number, permissions: string[], refetchUser: () => void }) {
    const { notify } = useNotifications();
    const canManageSwims = () => props.permissions.includes('swims.manage');

    const handleLogAction = async (type: 'swims' | 'booties') => {
        try {
            await apiRequest('POST', `/api/user/${props.user.id}/${type}`, { count: 1 });
            notify('Success', 'Logged successfully', 'success');
            props.refetchUser();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    return (
        <div class="dashboard-section active">
            {/* Finance Overview */}
            <article class="value-header full-height-no-margin">
                <div class="value-info">
                    <span class="value-title">Current Balance</span>
                    <div class="value-display" classList={{
                        'positive': props.user.balance >= 0,
                        'negative': props.user.balance < props.minMoney,
                        'warning': props.user.balance < 0 && props.user.balance >= props.minMoney
                    }}>
                        £{Number(props.user.balance || 0).toFixed(2)}
                    </div>
                </div>
            </article>

            <div class="liquid-container no-margin" style={{ "--liquid-padding": "1.25rem" }}>
                <Show when={props.stats}>
                    <div class="stats-grid compact">
                        <div class="stat-item">
                            <span class="stat-value small">£{props.stats.finance.year_spent.toFixed(2)}</span>
                            <span class="stat-label">Spent (Year)</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value small">£{props.stats.finance.total_spent.toFixed(2)}</span>
                            <span class="stat-label">Spent (Total)</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value small">£{props.stats.finance.total_fuel_cost.toFixed(2)}</span>
                            <span class="stat-label">Total Fuel Cost</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value small">£{props.stats.finance.avg_cost_per_event.toFixed(2)}</span>
                            <span class="stat-label">Avg. Event Cost</span>
                        </div>
                    </div>
                </Show>
            </div>

            {/* Attendance Overview */}
            <article class="value-header full-height-no-margin">
                <div class="value-info">
                    <span class="value-title">Membership Status</span>
                    <div class="value-display" classList={{ 'positive': props.user.is_member }}>
                        {props.user.is_member ? 'Active' : `${props.user.free_sessions || 0} Trials`}
                    </div>
                </div>
                <div class="value-actions" innerHTML={DASHBOARD_SVG}></div>
            </article>

            <div class="liquid-container no-margin" style={{ "--liquid-padding": "1.25rem" }}>
                <Show when={props.stats}>
                    <div class="stats-grid compact">
                        <div class="stat-item">
                            <span class="stat-value small">{props.stats.attendance.year_events}</span>
                            <span class="stat-label">Events (Year)</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value small">{props.stats.attendance.total_events}</span>
                            <span class="stat-label">Events (Total)</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value small">{props.stats.attendance.attendance_rate.toFixed(1)}%</span>
                            <span class="stat-label">Attendance Rate</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value small">{props.stats.attendance.late_unsigns}</span>
                            <span class="stat-label">Late Unsigns</span>
                        </div>
                    </div>
                </Show>
            </div>

            {/* Swimming Stats */}
            <Panel
                class="no-margin"
                title="Swimming Stats"
                icon={POOL_SVG}
                action={
                    <Show when={canManageSwims()}>
                        <div class="panel-actions">
                            <button class="small-btn" onClick={() => handleLogAction('swims')}><span innerHTML={ADD_SVG} /> Log Swim</button>
                            <button class="small-btn secondary" onClick={() => handleLogAction('booties')}><span innerHTML={ADD_SVG} /> Log Bootie</button>
                        </div>
                    </Show>
                }
            >
                <div class="stats-grid">
                    <div class="stat-item"><span class="stat-value">{props.user.swimmer_stats?.yearly?.swims || 0}</span><span class="stat-label">Yearly Swims</span></div>
                    <div class="stat-item"><span class="stat-value">{props.user.swimmer_stats?.yearly?.booties || 0}</span><span class="stat-label">Yearly Booties</span></div>
                    <div class="stat-item"><span class="stat-value">{props.user.swimmer_stats?.allTime?.swims || 0}</span><span class="stat-label">Total Swims</span></div>
                    <div class="stat-item"><span class="stat-value">{props.user.swimmer_stats?.allTime?.booties || 0}</span><span class="stat-label">Total Booties</span></div>
                </div>
            </Panel>
        </div>
    );
}
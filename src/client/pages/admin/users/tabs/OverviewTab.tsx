// todo clean up
import { Show, createSignal } from "solid-js";
import {
    FaSolidSwimmingPool, FaSolidPlus, FaSolidWallet, FaSolidGauge
} from 'solid-icons/fa';
import Panel from "@/components/Panel";
import SwimActionModal from "@/components/SwimActionModal";

export default function OverviewTab(props: { user: any, stats: any, minMoney: number, permissions: string[], refetchUser: () => void }) {
    const [isLogSwimModalOpen, setIsLogSwimModalOpen] = createSignal(false);
    const [isLogBootieModalOpen, setIsLogBootieModalOpen] = createSignal(false);
    const canManageSwims = () => props.permissions.includes('swims.manage');

    return (
        <div class="dashboard-section active">
            {/* Finance Overview */}
            <article class="value-header no-margin">
                <div class="value-info">
                    <span class="value-title">Current Balance</span>
                    <div class="value-display" classList={{
                        'positive': props.user.balance >= 0,
                        'negative': (props.user.balance + (props.user.debt_limit && (!props.user.debt_limit_expires_at || new Date(props.user.debt_limit_expires_at) > new Date()) ? Number(props.user.debt_limit) : 0)) < props.minMoney,
                        'warning': (props.user.balance < 0 && (props.user.balance + (props.user.debt_limit && (!props.user.debt_limit_expires_at || new Date(props.user.debt_limit_expires_at) > new Date()) ? Number(props.user.debt_limit) : 0)) >= props.minMoney)
                    }}>
                        £{Number(props.user.balance || 0).toFixed(2)}
                    </div>
                    <Show when={props.user.debt_limit > 0 && (!props.user.debt_limit_expires_at || new Date(props.user.debt_limit_expires_at) > new Date())}>
                        <div>
                            Debt Limit: £{Number(props.user.debt_limit).toFixed(2)}
                            <Show when={props.user.debt_limit_expires_at}>
                                <br />Expires: {new Date(props.user.debt_limit_expires_at).toLocaleDateString()}
                            </Show>
                        </div>
                    </Show>
                </div>
            </article>

            <div class="liquid-container no-margin">
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
            <article class="value-header no-margin">
                <div class="value-info">
                    <span class="value-title">Membership Status</span>
                    <div class="value-display" classList={{ 'positive': props.user.is_member }}>
                        {props.user.is_member ? 'Active' : `${props.user.free_sessions || 0} Trials`}
                    </div>
                </div>
                <div class="value-actions"><FaSolidGauge /></div>
            </article>

            <div class="liquid-container no-margin">
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
                icon={FaSolidSwimmingPool}
                titleCentered={true}
            >
                <div class="stats-grid">
                    <div class="stat-item"><span class="stat-value">{props.user.swimmer_stats?.yearly?.swims || 0}</span><span class="stat-label">Yearly Swims</span></div>
                    <div class="stat-item"><span class="stat-value">{props.user.swimmer_stats?.yearly?.booties || 0}</span><span class="stat-label">Yearly Booties</span></div>
                    <div class="stat-item"><span class="stat-value">{props.user.swimmer_stats?.allTime?.swims || 0}</span><span class="stat-label">Total Swims</span></div>
                    <div class="stat-item"><span class="stat-value">{props.user.swimmer_stats?.allTime?.booties || 0}</span><span class="stat-label">Total Booties</span></div>
                </div>
                <Show when={canManageSwims()}>
                    <div class="panel-actions-centered admin-swim-actions">
                        <button class="small-btn primary" onClick={() => setIsLogSwimModalOpen(true)}><FaSolidPlus /> Log Swim</button>
                        <button class="small-btn secondary" onClick={() => setIsLogBootieModalOpen(true)}><FaSolidPlus /> Log Bootie</button>
                    </div>
                </Show>
            </Panel>

            <SwimActionModal
                isOpen={isLogSwimModalOpen()}
                mode="swim"
                onClose={() => setIsLogSwimModalOpen(false)}
                onSuccess={() => props.refetchUser()}
                initialUser={{
                    id: props.user.id,
                    first_name: props.user.first_name,
                    last_name: props.user.last_name
                }}
            />

            <SwimActionModal
                isOpen={isLogBootieModalOpen()}
                mode="bootie"
                onClose={() => setIsLogBootieModalOpen(false)}
                onSuccess={() => props.refetchUser()}
                initialUser={{
                    id: props.user.id,
                    first_name: props.user.first_name,
                    last_name: props.user.last_name
                }}
            />
        </div>
    );
}
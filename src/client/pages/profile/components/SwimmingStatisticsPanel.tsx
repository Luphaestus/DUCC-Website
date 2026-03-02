import Panel from "@/components/Panel";
import { FaSolidUsers, FaSolidPersonSwimming } from 'solid-icons/fa';
import type { UserProfile } from "../types";

interface SwimmingStatisticsPanelProps {
    profile: UserProfile;
    onOpenLeaderboard: () => void;
}

export default function SwimmingStatisticsPanel(props: SwimmingStatisticsPanelProps) {
    return (
        <Panel
            title="Swimming Statistics"
            icon={<FaSolidPersonSwimming />}
            action={
                <button class="small-btn secondary" onClick={props.onOpenLeaderboard}>
                    <FaSolidUsers /> Leaderboard
                </button>
            }
        >
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-value">{props.profile.swimmer_stats?.yearly.swims || 0}</span>
                    <span class="stat-label">Yearly Swims</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">{props.profile.swimmer_stats?.yearly.rank || '-'}</span>
                    <span class="stat-label">Yearly Rank</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">{props.profile.swims}</span>
                    <span class="stat-label">Total Swims</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">{props.profile.booties}</span>
                    <span class="stat-label">Total Booties</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">#{props.profile.swimmer_rank}</span>
                    <span class="stat-label">All Time Rank</span>
                </div>
            </div>
        </Panel>
    );
}

import type { UserProfile } from "../types";

interface CurrentBalancePanelProps {
    profile: UserProfile;
    minMoney: number;
    onReportTopUp: () => void;
}

export default function CurrentBalancePanel(props: CurrentBalancePanelProps) {
    return (
        <article class="value-header liquid-container glass-panel no-margin">
            <div class="value-info">
                <span class="value-title">Current Balance</span>
                <div
                    class="value-display"
                    classList={{
                        positive: props.profile.balance >= 0,
                        negative: props.profile.balance < props.minMoney,
                        warning: props.profile.balance < 0 && props.profile.balance >= props.minMoney
                    }}
                >
                    £{props.profile.balance.toFixed(2)}
                </div>
            </div>
            <div class="value-actions">
                <button class="small-btn primary" onClick={props.onReportTopUp}>Report Top-Up</button>
            </div>
        </article>
    );
}

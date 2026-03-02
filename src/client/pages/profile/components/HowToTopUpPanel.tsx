import Panel from "@/components/Panel";
import { FaSolidWallet } from 'solid-icons/fa';
import type { UserProfile } from "../types";

interface HowToTopUpPanelProps {
    profile: UserProfile;
}

export default function HowToTopUpPanel(props: HowToTopUpPanelProps) {
    return (
        <Panel title="How to Top Up" icon={FaSolidWallet} class="glass-panel no-margin">
            <p>To add funds to your account, please make a bank transfer using the details below. Once sent, use the "Report Top-Up" button to let us know!</p>
            <div class="bank-details liquid-container secondary-bg">
                <div class="info-rows mini">
                    <div class="info-row"><span>Bank:</span> <strong>Durham University</strong></div>
                    <div class="info-row"><span>Sort Code:</span> <strong>20-27-66</strong></div>
                    <div class="info-row"><span>Account:</span> <strong>53770109</strong></div>
                    <div class="info-row">
                        <span>Reference:</span>
                        <strong>{props.profile.first_name.charAt(0).toUpperCase() + props.profile.last_name.toUpperCase() + "WEBSITE"}</strong>
                    </div>
                </div>
            </div>
            <p class="mt-4 small-text"><em>Verification is usually completed within 24-48 hours.</em></p>
        </Panel>
    );
}

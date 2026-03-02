import Panel from "@/components/Panel";
import { FaSolidPenToSquare, FaSolidShieldHalved } from 'solid-icons/fa';
import type { UserProfile } from "../types";

interface SafetyAndContactPanelProps {
    profile: UserProfile;
    onEdit: () => void;
}

export default function SafetyAndContactPanel(props: SafetyAndContactPanelProps) {
    return (
        <Panel title="Safety & Contact" icon={<FaSolidShieldHalved />} class="glass-panel no-margin">
            <div class="info-rows">
                <div class="info-row">
                    <span>Emergency Contact</span>
                    <span>{props.profile.phone_number || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span>First Aid</span>
                    <span>{props.profile.first_aid_expiry || 'N/A'}</span>
                </div>
            </div>
            <div class="form-actions">
                <button class="small-btn secondary full-width" onClick={props.onEdit}>
                    <FaSolidPenToSquare /> Edit Safety Info
                </button>
            </div>
        </Panel>
    );
}

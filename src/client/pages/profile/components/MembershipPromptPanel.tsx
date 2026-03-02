import type { UserProfile } from "../types";

interface MembershipPromptPanelProps {
    profile: UserProfile;
    onBecomeMember: () => void;
}

export default function MembershipPromptPanel(props: MembershipPromptPanelProps) {
    return (
        <article class="accent-panel liquid-container glass-panel no-margin" style={{ border: "none" }}>
            <div class="panel-content">
                <h2>You aren't a member yet</h2>
                <p>You have <strong>{props.profile.free_sessions}</strong> free trial events remaining before membership is required.</p>
            </div>
            <div class="panel-action">
                <button onClick={props.onBecomeMember}>Become a Member</button>
            </div>
        </article>
    );
}

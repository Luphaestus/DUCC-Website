interface LegalInfoRequiredPanelProps {
    onCompleteForm: () => void;
}

export default function LegalInfoRequiredPanel(props: LegalInfoRequiredPanelProps) {
    return (
        <div class="accent-panel warning-panel liquid-container mb-4">
            <div class="panel-content">
                <h3>Action Required: Membership Form</h3>
                <p>To fully activate your membership and access all club features, please complete your membership information form.</p>
            </div>
            <div class="panel-action">
                <button class="primary" onClick={props.onCompleteForm}>Complete Form</button>
            </div>
        </div>
    );
}

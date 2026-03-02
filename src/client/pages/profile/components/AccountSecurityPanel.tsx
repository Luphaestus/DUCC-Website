import { Show } from "solid-js";
import Panel from "@/components/Panel";

interface AccountSecurityPanelProps {
    totpEnabled: boolean;
    email2FAEnabled: boolean;
    passkeyCount: number;
    onChangePassword: () => void;
    onSetupTOTP: () => void;
    onDisableTOTP: () => void;
    onToggleEmail2FA: () => void;
    onOpenPasskeys: () => void;
    onDeleteAccount: () => void;
}

export default function AccountSecurityPanel(props: AccountSecurityPanelProps) {
    return (
        <Panel title="Account Security" class="glass-panel mb-4">
            <div class="settings-grid">
                <div class="two-fa-grid dual-grid">
                    <div class="liquid-container embedded-panel glass-panel">
                        <div class="setting-info">
                            <strong>Password</strong>
                            <p>Manage your account password</p>
                        </div>
                        <button class="small-btn secondary" onClick={props.onChangePassword}>Change</button>
                    </div>

                    <div class="liquid-container embedded-panel glass-panel">
                        <div class="setting-info">
                            <strong>Authenticator (TOTP)</strong>
                            <span class="status-tag" classList={{ success: props.totpEnabled, warning: !props.totpEnabled }}>
                                {props.totpEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                        <Show when={!props.totpEnabled}>
                            <button class="small-btn secondary" onClick={props.onSetupTOTP}>Setup</button>
                        </Show>
                        <Show when={props.totpEnabled}>
                            <button class="small-btn outline delete" onClick={props.onDisableTOTP}>Disable</button>
                        </Show>
                    </div>

                    <div class="liquid-container embedded-panel glass-panel">
                        <div class="setting-info">
                            <strong>Email 2FA</strong>
                            <span class="status-tag" classList={{ success: props.email2FAEnabled, warning: !props.email2FAEnabled }}>
                                {props.email2FAEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                        <button
                            class="small-btn"
                            classList={{ secondary: !props.email2FAEnabled, 'outline delete': props.email2FAEnabled }}
                            onClick={props.onToggleEmail2FA}
                        >
                            {props.email2FAEnabled ? 'Disable' : 'Enable'}
                        </button>
                    </div>

                    <div class="liquid-container embedded-panel glass-panel">
                        <div class="setting-info">
                            <strong>Passkey</strong>
                            <p>{props.passkeyCount} keys registered</p>
                        </div>
                        <button class="small-btn secondary" onClick={props.onOpenPasskeys}>Manage</button>
                    </div>

                    <div class="liquid-container embedded-panel danger-zone">
                        <div class="setting-info">
                            <strong style="color: var(--colour-bad)">Delete Account</strong>
                            <p>Permanently remove your account</p>
                        </div>
                        <button class="small-btn outline delete" onClick={props.onDeleteAccount}>Delete</button>
                    </div>
                </div>
            </div>
        </Panel>
    );
}

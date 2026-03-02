import { Show } from "solid-js";
import Panel from "@/components/Panel";
import { FaSolidBolt, FaSolidDownload } from 'solid-icons/fa';

interface AppInstallationPanelProps {
    isInstalled: boolean;
    manualInstall: boolean;
    hasDeferredPrompt: boolean;
    isSubscribed: boolean;
    notificationPermission: NotificationPermission | 'unsupported';
    isSubscribing: boolean;
    isUnsubscribing: boolean;
    onInstall: () => void;
    onSubscribe: () => void;
    onUnsubscribe: () => void;
}

export default function AppInstallationPanel(props: AppInstallationPanelProps) {
    const installLabel = () => {
        if (props.hasDeferredPrompt) return 'Install';
        if (props.manualInstall) return 'Manual Install';
        return 'Install Unavailable';
    };

    const pushLabel = () => {
        if (props.isSubscribing) return 'Subscribing...';
        if (props.notificationPermission === 'denied') return 'Blocked in Browser';
        if (props.notificationPermission === 'granted') return 'Enable for This Device';
        return 'Enable';
    };

    const pushDescription = () => {
        if (props.isSubscribed) return 'Notifications are enabled for this device.';
        if (props.notificationPermission === 'denied') return 'Notifications are blocked by your browser. Enable them in site settings.';
        if (props.notificationPermission === 'granted') return 'Permission granted. Click below to finish enabling push for this device.';
        return 'Receive alerts for events, payments and news.';
    };

    const canSubscribe = () => !props.isSubscribing && props.notificationPermission !== 'denied';

    return (
        <Panel title="App Installation" class="glass-panel mb-4">
            <div class="settings-grid">
                <div class="two-fa-grid dual-grid">
                    <Show when={!props.isInstalled}>
                        <div class="liquid-container embedded-panel glass-panel">
                            <div class="setting-info">
                                <strong>Install App</strong>
                                <p>
                                    <Show
                                        when={props.manualInstall}
                                        fallback={props.hasDeferredPrompt
                                            ? "Get the official DUCC app for your device."
                                            : "Look for the install icon in your address bar, or check your browser menu. If not visible, ensure you have used the site for a few minutes."
                                        }
                                    >
                                        Tap the Share button or menu and select "Add to Home Screen" (or "Add to Dock")
                                    </Show>
                                </p>
                            </div>
                            <Show when={!props.manualInstall}>
                                <button
                                    class="small-btn primary"
                                    onClick={props.onInstall}
                                    disabled={!props.hasDeferredPrompt}
                                    title={!props.hasDeferredPrompt ? "Browser is still checking if the app can be installed. This usually takes a few moments of browsing." : "Install DUCC"}
                                >
                                    <FaSolidDownload style={{ "margin-right": "0.25rem", width: "1em", height: "1em" }} />
                                    {installLabel()}
                                </button>
                            </Show>
                        </div>
                    </Show>

                    <div class="liquid-container embedded-panel glass-panel">
                        <div class="setting-info">
                            <strong>Push Notifications</strong>
                            <p>
                                {pushDescription()}
                            </p>
                        </div>
                        <Show when={!props.isSubscribed}>
                            <button
                                class="small-btn primary"
                                onClick={props.onSubscribe}
                                disabled={!canSubscribe()}
                            >
                                <FaSolidBolt style={{ "margin-right": "0.25rem", width: "1em", height: "1em" }} />
                                {pushLabel()}
                            </button>
                        </Show>
                        <Show when={props.isSubscribed}>
                            <button
                                class="small-btn outline delete"
                                onClick={props.onUnsubscribe}
                                disabled={props.isUnsubscribing}
                            >
                                {props.isUnsubscribing ? 'Disabling...' : 'Disable'}
                            </button>
                        </Show>
                    </div>
                </div>
            </div>
        </Panel>
    );
}

import { Show } from "solid-js";
import Panel from "@/components/Panel";

interface NotificationSettings {
    [key: string]: number;
}

interface NotificationPreferencesPanelProps {
    settings: NotificationSettings | null;
    onToggle: (key: string) => void;
}

export default function NotificationPreferencesPanel(props: NotificationPreferencesPanelProps) {
    return (
        <Panel title="Notification Preferences" class="glass-panel mb-4">
            <p>Decide what updates you want to receive and how you want to be notified.</p>
            <Show when={props.settings} fallback={<p aria-busy="true">Loading preferences...</p>}>
                <div class="notification-settings-grid">
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th style="text-align: center;">Email</th>
                                <th style="text-align: center;">Push</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <strong>Payments</strong>
                                    <p class="small-text">New transactions & balance alerts</p>
                                </td>
                                <td style="text-align: center;">
                                    <input type="checkbox" role="switch" checked={props.settings?.email_payments === 1} onChange={() => props.onToggle('email_payments')} />
                                </td>
                                <td style="text-align: center;">
                                    <input type="checkbox" role="switch" checked={props.settings?.push_payments === 1} onChange={() => props.onToggle('push_payments')} />
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>Events</strong>
                                    <p class="small-text">Signups, cancellations & updates</p>
                                </td>
                                <td style="text-align: center;">
                                    <input type="checkbox" role="switch" checked={props.settings?.email_events === 1} onChange={() => props.onToggle('email_events')} />
                                </td>
                                <td style="text-align: center;">
                                    <input type="checkbox" role="switch" checked={props.settings?.push_events === 1} onChange={() => props.onToggle('push_events')} />
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>Club News</strong>
                                    <p class="small-text">Announcements & general updates</p>
                                </td>
                                <td style="text-align: center;">
                                    <input type="checkbox" role="switch" checked={props.settings?.email_news === 1} onChange={() => props.onToggle('email_news')} />
                                </td>
                                <td style="text-align: center;">
                                    <input type="checkbox" role="switch" checked={props.settings?.push_news === 1} onChange={() => props.onToggle('push_news')} />
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>Event Reminders</strong>
                                    <p class="small-text">Alerts 30 mins before your joined events</p>
                                </td>
                                <td style="text-align: center;">
                                    <input type="checkbox" role="switch" checked={props.settings?.email_event_reminders === 1} onChange={() => props.onToggle('email_event_reminders')} />
                                </td>
                                <td style="text-align: center;">
                                    <input type="checkbox" role="switch" checked={props.settings?.push_event_reminders === 1} onChange={() => props.onToggle('push_event_reminders')} />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Show>
        </Panel>
    );
}

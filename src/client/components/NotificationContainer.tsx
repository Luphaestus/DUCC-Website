import { For, Show } from "solid-js";
import { useNotifications } from "../stores/notifications";

export default function NotificationContainer() {
    const { notifications, removeNotification } = useNotifications();

    return (
        <div id="notification-container" role="alert" aria-live="assertive">
            <For each={notifications()}>
                {(n) => (
                    <div 
                        class={`notification notification-${n.type}`} 
                        onClick={() => removeNotification(n.id)}
                    >
                        <strong>{n.title}</strong>
                        <Show when={n.message}>
                            <p>{n.message}</p>
                        </Show>
                    </div>
                )}
            </For>
        </div>
    );
}

// todo clean up
import { createSignal, createResource, Show, onMount, onCleanup, For } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { ADD_SVG, POOL_SVG, CHECK_SVG, CLOSE_SVG } from '@/utils/icons';
import Panel from "@/components/Panel";
import { onUpdate } from "@/utils/updates";

export default function SwimsTab(props: { user: any, typeFilter?: 'swim' | 'bootie' }) {
    const { notify } = useNotifications();

    onMount(() => {
        const cleanup = onUpdate((event) => {
            if (event.type === 'swims_update') {
                refetchCounts();
                refetchHistory();
            }
        });
        onCleanup(cleanup);
    });

    const [counts, { refetch: refetchCounts }] = createResource(
        () => props.user?.id,
        async (id) => {
            if (!id) return { swims: 0, booties: 0 };
            const res = await apiRequest('GET', `/api/user/${id}/elements/swims,booties`);
            return res.res || res;
        }
    );

    const [history, { refetch: refetchHistory }] = createResource(
        () => ({ userId: props.user?.id, typeFilter: props.typeFilter }),
        async ({ userId, typeFilter }) => {
            if (!userId) return [];
            const res = await apiRequest('GET', `/api/user/${userId}/swims/history`);
            if (typeFilter) {
                return (res.data || []).filter((item: any) => item.type === typeFilter);
            }
            return res.data || [];
        }
    );

    const [swimAmount, setSwimAmount] = createSignal(1);
    const [swimMessage, setSwimMessage] = createSignal("");

    const handleAddSwims = async () => {
        if (!props.user?.id) return;
        if (!swimMessage().trim()) {
            notify('Error', 'Explanation message is required.', 'error');
            return;
        }
        try {
            await apiRequest('POST', `/api/user/${props.user.id}/swims`, { count: swimAmount(), message: swimMessage() });
            notify('Success', 'Swims added.', 'success');
            setSwimMessage("");
            refetchCounts();
            refetchHistory();
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    const toggleBootie = async (swimId: number) => {
        try {
            await apiRequest('POST', `/api/user/swims/${swimId}/bootie/toggle`);
            notify('Success', 'Bootie status updated.', 'success');
            refetchCounts();
            refetchHistory();
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    return (
        <div class="swims-management-layout">
            <div class="grid-2-col gap-6">
                <Show when={!props.typeFilter}>
                    <Panel title="Add Swims" icon={POOL_SVG}>
                        <div class="current-count">
                            <span class="count-label">Total Swims: </span>
                            <strong class="count-value">
                                <Show when={!counts.loading} fallback="...">
                                    {counts()?.swims || 0}
                                </Show>
                            </strong>
                            <span class="count-label ml-4">Total Booties: </span>
                            <strong class="count-value">
                                <Show when={!counts.loading} fallback="...">
                                    {counts()?.booties || 0}
                                </Show>
                            </strong>
                        </div>

                        <div class="modern-form">
                            <div class="grid-2-col" style={{ "grid-template-columns": "80px 1fr" }}>
                                <label>Count
                                    <input type="number" value={swimAmount()} onInput={e => setSwimAmount(parseInt(e.currentTarget.value) || 0)} min="1" />
                                </label>
                                <label>Explanation
                                    <input type="text" value={swimMessage()} onInput={e => setSwimMessage(e.currentTarget.value)} placeholder="e.g. Swam at Maiden Castle" />
                                </label>
                            </div>
                            <button class="primary full-width" onClick={handleAddSwims}><span innerHTML={ADD_SVG} /> Record Swims</button>
                        </div>
                    </Panel>
                </Show>

                <Panel title={props.typeFilter === 'swim' ? 'Swim History' : props.typeFilter === 'bootie' ? 'Bootie History' : 'Swim History & Booties'} icon={<div class="bootie-icon">🥾</div>}>
                    <Show when={!props.typeFilter}>
                        <p class="small-text">Tick off swims once the bootie has been completed.</p>
                    </Show>
                    <div class="item-list scrollable-list" style={{ "max-height": "400px", "overflow-y": "auto" }}>
                        <For each={history()} fallback={<p class="text-muted">No {props.typeFilter || 'swim'} history found.</p>}>
                            {(item) => (
                                <div class="list-item" classList={{ 'primary-glass': !!item.is_bootie }}>
                                    <div class="item-details">
                                        <span class="item-title">{item.message || '(No explanation)'}</span>
                                        <span class="item-subtitle">
                                            {item.count} swim{item.count > 1 ? 's' : ''} • {new Date(item.created_at).toLocaleDateString()} by {item.added_by_name}
                                        </span>
                                    </div>
                                    <div class="item-action">
                                        <Show when={!props.typeFilter}>
                                            <button
                                                class="small-btn"
                                                classList={{ 'primary': !!item.is_bootie, 'secondary outline': !item.is_bootie }}
                                                onClick={() => toggleBootie(item.id)}
                                                title={item.is_bootie ? 'Unmark as bootie' : 'Mark as bootie done'}
                                            >
                                                <span innerHTML={item.is_bootie ? CHECK_SVG : 'Mark Done'} />
                                            </button>
                                        </Show>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </Panel>
            </div>
        </div>
    );
}

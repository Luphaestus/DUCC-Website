import { createSignal, createResource, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { ADD_SVG, POOL_SVG } from '@/utils/icons';
import Panel from "@/components/Panel";

export default function SwimsTab(props: { user: any }) {
    const { notify } = useNotifications();
    const [counts, { mutate, refetch }] = createResource(
        () => props.user?.id,
        async (id) => {
            if (!id || isNaN(parseInt(id))) {
                return { swims: 0, booties: 0 };
            }
            return await apiRequest('GET', `/api/user/${id}/elements/swims,booties`);
        }
    );

    const [swimAmount, setSwimAmount] = createSignal(1);
    const [bootieAmount, setBootieAmount] = createSignal(1);

    const handleAdd = async (type: 'swims' | 'booties', amount: number) => {
        if (!props.user?.id) {
            notify('Error', 'No user selected', 'error');
            return;
        }
        try {
            await apiRequest('POST', `/api/user/${props.user.id}/${type}`, { count: amount });
            notify('Success', `${type === 'swims' ? 'Swims' : 'Booties'} added.`, 'success');
            mutate({ ...counts()!, [type]: (counts()![type] || 0) + amount });
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    return (
        <div class="swims-management-grid" style={{ display: "grid", "grid-template-columns": "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
            <Panel title="Manage Swims" icon={POOL_SVG}>
                <div class="current-count" style={{ "font-size": "1.2rem", "margin-bottom": "1rem" }}>
                    <span class="count-label">Current Swims: </span>
                    <strong class="count-value">
                        <Show when={!counts.loading} fallback="...">
                            {counts()?.swims || 0}
                        </Show>
                    </strong>
                </div>
                <div class="control-actions">
                    <div class="input-group" style={{ display: "flex", gap: "0.5rem" }}>
                        <input type="number" style={{ width: "80px", margin: 0 }} value={swimAmount()} onInput={e => setSwimAmount(parseInt(e.currentTarget.value) || 0)} min="1" />
                        <button class="primary" style={{ margin: 0, flex: 1 }} onClick={() => handleAdd('swims', swimAmount())}><span innerHTML={ADD_SVG} /> Add</button>
                    </div>
                </div>
            </Panel>

            <Panel title="Manage Booties" icon={<div class="bootie-icon">🥾</div>}>
                <div class="current-count" style={{ "font-size": "1.2rem", "margin-bottom": "1rem" }}>
                    <span class="count-label">Current Booties: </span>
                    <strong class="count-value">
                        <Show when={!counts.loading} fallback="...">
                            {counts()?.booties || 0}
                        </Show>
                    </strong>
                </div>
                <div class="control-actions">
                    <div class="input-group" style={{ display: "flex", gap: "0.5rem" }}>
                        <input type="number" style={{ width: "80px", margin: 0 }} value={bootieAmount()} onInput={e => setBootieAmount(parseInt(e.currentTarget.value) || 0)} min="1" />
                        <button class="secondary" style={{ margin: 0, flex: 1 }} onClick={() => handleAdd('booties', bootieAmount())}><span innerHTML={ADD_SVG} /> Add</button>
                    </div>
                </div>
            </Panel>
        </div>
    );
}

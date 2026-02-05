import { createResource, For } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { KAYAKING_SVG } from '@/utils/icons';
import Panel from "@/components/Panel";

export default function KitTab(props: { userId: number }) {
    const { notify } = useNotifications();

    const [kitItems] = createResource(async () => {
        try {
            return await apiRequest('GET', '/api/kit');
        } catch { return { data: [] }; }
    });

    const [userKitPrefs, { refetch: refetchKitPrefs }] = createResource(() => props.userId, async (id) => {
        try {
            const res = await apiRequest('GET', `/api/kit/preferences/${id}`);
            return (res.data || []) as any[];
        } catch { return []; }
    });

    const handleUpdateKitPrefs = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const selected = Array.from(form.querySelectorAll('input[type="checkbox"]:checked')).map(cb => parseInt((cb as HTMLInputElement).value));
        try {
            await apiRequest('POST', `/api/kit/preferences/${props.userId}`, { itemIds: selected });
            notify('Success', 'Kit preferences updated.', 'success');
            refetchKitPrefs();
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    return (
        <section class="dashboard-section active">
            <Panel 
                title="Default Kit Requirements" 
                icon={KAYAKING_SVG}
            >
                <p>Manage the equipment this user usually needs to borrow from the club for trips.</p>
                
                <form onSubmit={handleUpdateKitPrefs} class="modern-form">
                    <div class="item-list">
                        <For each={kitItems()?.data || []}>
                            {(item) => (
                                <label class="list-item checkbox-item">
                                    <div class="item-icon"><span innerHTML={KAYAKING_SVG} /></div>
                                    <div class="item-details">
                                        <span class="item-title">{item.name}</span>
                                        <span class="item-subtitle">{item.type} • {item.size}</span>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        value={item.id} 
                                        checked={userKitPrefs()?.some(p => p.id === item.id)} 
                                    />
                                </label>
                            )}
                        </For>
                    </div>
                    <button type="submit" class="primary full-width mt-4">Save Preferences</button>
                </form>
            </Panel>
        </section>
    );
}

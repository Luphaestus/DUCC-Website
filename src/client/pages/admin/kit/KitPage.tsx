// todo clean up
import { createSignal, createResource, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import Panel from "@/components/Panel";
import { ADD_SVG, EDIT_SVG, DELETE_SVG, CLOSE_SVG, SAVE_SVG } from '@/utils/icons';

interface KitItem {
    id: number;
    name: string;
    type: string; // 'paddle', 'ba', etc.
    size: string;
    total_quantity: number;
}

export default function KitPage() {
    const { notify } = useNotifications();
    const [editingItem, setEditingItem] = createSignal<KitItem | null>(null);
    const [isCreating, setIsCreating] = createSignal(false);

    const [items, { refetch }] = createResource(async () => {
        const res = await apiRequest('GET', '/api/kit');
        return (res || []) as KitItem[];
    });

    const handleSave = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = {
            name: formData.get('name'),
            type: formData.get('type'),
            size: formData.get('size'),
            total_quantity: parseInt(formData.get('total_quantity') as string)
        };

        try {
            if (editingItem()) {
                await apiRequest('PUT', `/api/kit/${editingItem()!.id}`, data);
                notify('Success', 'Item updated', 'success');
            } else {
                await apiRequest('POST', '/api/kit', data);
                notify('Success', 'Item created', 'success');
            }
            setEditingItem(null);
            setIsCreating(false);
            refetch();
        } catch (e: any) {
            notify('Error', e.message, 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this item?')) return;
        try {
            await apiRequest('DELETE', `/api/kit/${id}`);
            notify('Success', 'Item deleted', 'success');
            refetch();
        } catch (e: any) {
            notify('Error', e.message, 'error');
        }
    };

    return (
        <div class="glass-layout">
            <Panel 
                title="Club Kit Inventory" 
                action={
                    <button class="small-btn primary" onClick={() => { setIsCreating(true); setEditingItem(null); }}>
                        <span innerHTML={ADD_SVG} /> Add Item
                    </button>
                }
            >
                <div class="glass-table-container">
                    <table class="glass-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Size</th>
                                <th>Quantity</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <Show when={isCreating()}>
                                <tr>
                                    <td colspan="5">
                                        <form class="inline-form" onSubmit={handleSave} style="display: flex; gap: 0.5rem; align-items: center;">
                                            <input name="name" placeholder="Name" required />
                                            <select name="type">
                                                <option value="paddle">Paddle</option>
                                                <option value="ba">BA (Buoyancy Aid)</option>
                                                <option value="boat">Boat</option>
                                                <option value="wetsuit">Wetsuit</option>
                                                <option value="cag">Cag</option>
                                                <option value="helmet">Helmet</option>
                                                <option value="other">Other</option>
                                            </select>
                                            <select name="size">
                                                <option value="None">None</option>
                                                <option value="XS">XS</option>
                                                <option value="S">S</option>
                                                <option value="M">M</option>
                                                <option value="L">L</option>
                                                <option value="XL">XL</option>
                                                <option value="XXL">XXL</option>
                                            </select>
                                            <input name="total_quantity" type="number" placeholder="Qty" required style="width: 80px;" />
                                            <button type="submit" class="icon-btn success" innerHTML={SAVE_SVG}></button>
                                            <button type="button" class="icon-btn warning" onClick={() => setIsCreating(false)} innerHTML={CLOSE_SVG}></button>
                                        </form>
                                    </td>
                                </tr>
                            </Show>
                            <For each={items()}>
                                {item => (
                                    <tr>
                                        <Show when={editingItem()?.id === item.id} fallback={
                                            <>
                                                <td>{item.name}</td>
                                                <td><span class="badge neutral">{item.type}</span></td>
                                                <td>{item.size}</td>
                                                <td>{item.total_quantity}</td>
                                                <td>
                                                    <div class="action-group">
                                                        <button class="icon-btn" onClick={() => setEditingItem(item)} innerHTML={EDIT_SVG}></button>
                                                        <button class="icon-btn delete" onClick={() => handleDelete(item.id)} innerHTML={DELETE_SVG}></button>
                                                    </div>
                                                </td>
                                            </>
                                        }>
                                            <td colspan="5">
                                                <form class="inline-form" onSubmit={handleSave} style="display: flex; gap: 0.5rem; align-items: center;">
                                                    <input name="name" value={item.name} required />
                                                    <select name="type" value={item.type}>
                                                        <option value="paddle">Paddle</option>
                                                        <option value="ba">BA</option>
                                                        <option value="boat">Boat</option>
                                                        <option value="wetsuit">Wetsuit</option>
                                                        <option value="cag">Cag</option>
                                                        <option value="helmet">Helmet</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                    <select name="size" value={item.size}>
                                                        <option value="None">None</option>
                                                        <option value="XS">XS</option>
                                                        <option value="S">S</option>
                                                        <option value="M">M</option>
                                                        <option value="L">L</option>
                                                        <option value="XL">XL</option>
                                                        <option value="XXL">XXL</option>
                                                    </select>
                                                    <input name="total_quantity" type="number" value={item.total_quantity} required style="width: 80px;" />
                                                    <button type="submit" class="icon-btn success" innerHTML={SAVE_SVG}></button>
                                                    <button type="button" class="icon-btn warning" onClick={() => setEditingItem(null)} innerHTML={CLOSE_SVG}></button>
                                                </form>
                                            </td>
                                        </Show>
                                    </tr>
                                )}
                            </For>
                        </tbody>
                    </table>
                </div>
            </Panel>
        </div>
    );
}

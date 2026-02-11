// todo clean up
import { createSignal, createResource, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import Panel from "@/components/Panel";
import { ADD_SVG, EDIT_SVG, DELETE_SVG, CLOSE_SVG, SAVE_SVG } from '@/utils/icons';

interface KitVariant {
    id?: number;
    name: string;
    total_quantity: number;
}

interface KitItem {
    id: number;
    name: string;
    type: string;
    description?: string;
    variants: KitVariant[];
}

export default function KitPage() {
    const { notify } = useNotifications();
    const [editingItem, setEditingItem] = createSignal<KitItem | null>(null);
    const [isCreating, setIsCreating] = createSignal(false);
    const [tempVariants, setTempVariants] = createSignal<KitVariant[]>([]);

    const [items, { refetch }] = createResource(async () => {
        const res = await apiRequest('GET', '/api/kit');
        return (res || []) as KitItem[];
    });

    const addVariantField = () => {
        setTempVariants([...tempVariants(), { name: '', total_quantity: 0 }]);
    };

    const removeVariantField = (index: number) => {
        setTempVariants(tempVariants().filter((_, i) => i !== index));
    };

    const updateVariantField = (index: number, field: keyof KitVariant, value: any) => {
        const updated = [...tempVariants()];
        updated[index] = { ...updated[index], [field]: value };
        setTempVariants(updated);
    };

    const startEditing = (item: KitItem) => {
        setEditingItem(item);
        setTempVariants([...item.variants]);
        setIsCreating(false);
    };

    const startCreating = () => {
        setIsCreating(true);
        setEditingItem(null);
        setTempVariants([{ name: '', total_quantity: 0 }]);
    };

    const handleSave = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = {
            name: formData.get('name'),
            type: formData.get('type'),
            description: formData.get('description'),
            variants: tempVariants()
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
                    <button class="small-btn primary" onClick={startCreating}>
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
                                <th>Variants (Size/Qty)</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <Show when={isCreating() || editingItem()}>
                                <tr class="editing-row">
                                    <td colspan="4">
                                        <form class="complex-form" onSubmit={handleSave}>
                                            <div class="form-grid">
                                                <div class="form-group">
                                                    <label>Item Name</label>
                                                    <input name="name" value={editingItem()?.name || ''} placeholder="e.g. Cag, Paddle" required />
                                                </div>
                                                <div class="form-group">
                                                    <label>Type</label>
                                                    <select name="type" value={editingItem()?.type || 'other'}>
                                                        <option value="paddle">Paddle</option>
                                                        <option value="ba">BA</option>
                                                        <option value="boat">Boat</option>
                                                        <option value="wetsuit">Wetsuit</option>
                                                        <option value="cag">Cag</option>
                                                        <option value="helmet">Helmet</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </div>
                                            </div>
                                            
                                            <div class="variants-section">
                                                <div class="section-header">
                                                    <label>Variants</label>
                                                    <button type="button" class="small-btn secondary" onClick={addVariantField}>+ Add Variant</button>
                                                </div>
                                                <div class="variants-list">
                                                    <For each={tempVariants()}>
                                                        {(v, i) => (
                                                            <div class="variant-item">
                                                                <input 
                                                                    placeholder="Size/Variant" 
                                                                    value={v.name} 
                                                                    onInput={(e) => updateVariantField(i(), 'name', e.currentTarget.value)}
                                                                    required 
                                                                />
                                                                <input 
                                                                    type="number" 
                                                                    placeholder="Qty" 
                                                                    value={v.total_quantity} 
                                                                    onInput={(e) => updateVariantField(i(), 'total_quantity', parseInt(e.currentTarget.value))}
                                                                    required 
                                                                    style="width: 80px;"
                                                                />
                                                                <button type="button" class="icon-btn delete" onClick={() => removeVariantField(i())} innerHTML={CLOSE_SVG}></button>
                                                            </div>
                                                        )}
                                                    </For>
                                                </div>
                                            </div>

                                            <div class="form-actions">
                                                <button type="submit" class="primary"><span innerHTML={SAVE_SVG} /> Save Item</button>
                                                <button type="button" class="secondary" onClick={() => { setEditingItem(null); setIsCreating(false); }}><span innerHTML={CLOSE_SVG} /> Cancel</button>
                                            </div>
                                        </form>
                                    </td>
                                </tr>
                            </Show>
                            <For each={items()}>
                                {item => (
                                    <Show when={editingItem()?.id !== item.id && !isCreating()}>
                                        <tr>
                                            <td>{item.name}</td>
                                            <td><span class="badge neutral">{item.type}</span></td>
                                            <td>
                                                <div class="variant-badges">
                                                    <For each={item.variants}>
                                                        {v => <span class="badge outline">{v.name}: {v.total_quantity}</span>}
                                                    </For>
                                                </div>
                                            </td>
                                            <td>
                                                <div class="action-group">
                                                    <button class="icon-btn" onClick={() => startEditing(item)} innerHTML={EDIT_SVG}></button>
                                                    <button class="icon-btn delete" onClick={() => handleDelete(item.id)} innerHTML={DELETE_SVG}></button>
                                                </div>
                                            </td>
                                        </tr>
                                    </Show>
                                )}
                            </For>
                        </tbody>
                    </table>
                </div>
            </Panel>
        </div>
    );
}

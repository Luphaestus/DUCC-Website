import { createSignal, createResource, Show, For, createMemo } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import Modal from "@/components/Modal";
import Panel from "@/components/Panel";
import {
    KAYAKING_SVG
} from '@/utils/icons';
import { KitItem, KitPref, KitVariant } from "./types";
import { useProfile } from "./ProfileLayout";

export default function ProfileKit() {
    const { notify } = useNotifications();
    const context = useProfile();
    const profile = () => context?.profile();

    const [userKitPrefs, { refetch: refetchKitPrefs }] = createResource(async () => {
        try {
            const res = await apiRequest('GET', '/api/kit/preferences');
            return (res || []) as KitPref[];
        } catch { return []; }
    });

    const [kitItems] = createResource(async () => {
        try {
            const res = await apiRequest('GET', '/api/kit');
            return res || [];
        } catch { return []; }
    });

    const [isKitModalOpen, setIsKitModalOpen] = createSignal(false);
    const [activeKitItem, setActiveKitItem] = createSignal<KitItem | null>(null);

    const openKitModal = (item: KitItem) => {
        setActiveKitItem(item);
        setIsKitModalOpen(true);
    };

    const handleSelectVariant = async (variantId: number | null) => {
        const item = activeKitItem();
        if (!item) return;

        const current = userKitPrefs() || [];
        let newSelections;

        if (variantId === -1) {
            newSelections = current.filter(p => p.kit_item_id !== item.id)
                .map(p => ({ kit_item_id: p.kit_item_id, kit_variant_id: p.kit_variant_id }));
        } else {
            const newPref = { kit_item_id: item.id, kit_variant_id: variantId };
            const existing = current.find(p => p.kit_item_id === item.id);
            if (existing) {
                newSelections = current.map(p => p.kit_item_id === item.id ? newPref : { kit_item_id: p.kit_item_id, kit_variant_id: p.kit_variant_id });
            } else {
                newSelections = [...current.map(p => ({ kit_item_id: p.kit_item_id, kit_variant_id: p.kit_variant_id })), newPref];
            }
        }

        try {
            await apiRequest('POST', '/api/kit/preferences', { itemIds: newSelections });
            notify('Success', 'Preferences updated', 'success');
            setIsKitModalOpen(false);
            refetchKitPrefs();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    return (
        <Show when={profile()} fallback={<p aria-busy="true">Loading...</p>}>
            <section class="dashboard-section active">
                <Panel
                    title="Default Kit Requirements"
                    icon={KAYAKING_SVG}
                    class="glass-panel"
                >
                    <p>Select the equipment you usually need to borrow from the club for trips. These will be your default requests when you join an event.</p>

                    <div class="item-list">
                        <For each={kitItems() || []}>
                            {(item) => {
                                const pref = createMemo(() => userKitPrefs()?.find(p => p.kit_item_id === item.id));
                                const isSelected = () => !!pref();
                                const variantLabel = () => {
                                    const p = pref();
                                    if (!p) return '';
                                    return p.variant_name ? ` (${p.variant_name})` : ' (Not Sure)';
                                };

                                return (
                                    <div
                                        class="list-item clickable"
                                        classList={{ 'primary-glass': isSelected() }}
                                        onClick={() => openKitModal(item)}
                                    >
                                        <div class="item-icon"><span innerHTML={KAYAKING_SVG} /></div>
                                        <div class="item-details">
                                            <span class="item-title">{item.name}{variantLabel()}</span>
                                            <span class="item-subtitle">{item.type} • {item.variants?.map((v: KitVariant) => v.name).join(', ') || 'No variants'}</span>
                                        </div>
                                    </div>
                                );
                            }}
                        </For>
                    </div>
                </Panel>
            </section>

            <Modal isOpen={isKitModalOpen()} onClose={() => setIsKitModalOpen(false)} title={`Default ${activeKitItem()?.name}`}>
                <div class="variant-selection">
                    <p>Select your default size/variant for {activeKitItem()?.name}:</p>
                    <div class="item-list">
                        <For each={activeKitItem()?.variants || []}>
                            {(variant) => (
                                <button
                                    class="list-item clickable"
                                    onClick={() => handleSelectVariant(variant.id)}
                                >
                                    <div class="item-details">
                                        <span class="item-title">{variant.name}</span>
                                    </div>
                                </button>
                            )}
                        </For>
                        <button
                            class="list-item clickable"
                            onClick={() => handleSelectVariant(null)}
                        >
                            <div class="item-details">
                                <span class="item-title">Don't Know / Not Sure</span>
                                <span class="item-subtitle">Pick each time you join an event</span>
                            </div>
                        </button>

                        <Show when={userKitPrefs()?.some(p => p.kit_item_id === activeKitItem()?.id)}>
                            <button
                                class="list-item clickable danger-hover"
                                onClick={() => handleSelectVariant(-1)}
                                style="margin-top: 1rem; border-color: var(--error-color);"
                            >
                                <div class="item-details">
                                    <span class="item-title" style="color: var(--error-color);">Remove Default Preference</span>
                                </div>
                            </button>
                        </Show>
                    </div>
                </div>
            </Modal>
        </Show>
    );
}

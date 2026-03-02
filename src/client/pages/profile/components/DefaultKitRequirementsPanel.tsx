import { For, createMemo } from "solid-js";
import Panel from "@/components/Panel";
import { MdFillKayaking } from "solid-icons/md";
import type { KitItem, KitPref, KitVariant } from "../types";

interface DefaultKitRequirementsPanelProps {
    kitItems: KitItem[];
    userKitPrefs: KitPref[];
    onOpenItem: (item: KitItem) => void;
}

export default function DefaultKitRequirementsPanel(props: DefaultKitRequirementsPanelProps) {
    return (
        <Panel title="Default Kit Requirements" icon={MdFillKayaking} class="glass-panel">
            <p>Select the equipment you usually need to borrow from the club for trips. These will be your default requests when you join an event.</p>

            <div class="item-list">
                <For each={props.kitItems}>
                    {(item) => {
                        const pref = createMemo(() => props.userKitPrefs.find(p => p.kit_item_id === item.id));
                        const isSelected = () => !!pref();
                        const variantLabel = () => {
                            const selected = pref();
                            if (!selected) return '';
                            return selected.variant_name ? ` (${selected.variant_name})` : ' (Not Sure)';
                        };

                        return (
                            <div class="list-item clickable" classList={{ 'primary-glass': isSelected() }} onClick={() => props.onOpenItem(item)}>
                                <div class="item-icon"><MdFillKayaking /></div>
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
    );
}

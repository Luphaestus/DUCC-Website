import { createMemo, createSignal, For } from "solid-js";
import { fuzzyFilterSort } from "@/utils/fuzzySearch";

interface BaseItem {
    id: number | string;
}

interface FuzzyPickerProps<T extends BaseItem> {
    items: T[];
    selectedId?: number | string | null;
    onSelect: (item: T) => void;
    getLabel: (item: T) => string;
    placeholder?: string;
    emptyText?: string;
    limit?: number;
    class?: string;
}

export default function FuzzyPicker<T extends BaseItem>(props: FuzzyPickerProps<T>) {
    const [query, setQuery] = createSignal('');

    const filteredItems = createMemo(() => {
        return fuzzyFilterSort(query(), props.items || [], props.getLabel, props.limit || 12);
    });

    return (
        <div class={`fuzzy-picker ${props.class || ''}`.trim()}>
            <input
                type="text"
                value={query()}
                onInput={(event) => setQuery(event.currentTarget.value)}
                placeholder={props.placeholder || 'Search'}
            />

            <div class="fuzzy-picker-results liquid-container">
                <For each={filteredItems()} fallback={<p class="small-text no-margin">{props.emptyText || 'No matches found.'}</p>}>
                    {(item) => (
                        <button
                            type="button"
                            class="secondary outline small-btn"
                            classList={{ active: props.selectedId != null && String(props.selectedId) === String(item.id) }}
                            onClick={() => props.onSelect(item)}
                        >
                            {props.getLabel(item)}
                        </button>
                    )}
                </For>
            </div>
        </div>
    );
}

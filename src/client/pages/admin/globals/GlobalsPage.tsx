// todo clean up
import { createSignal, createResource, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import Modal from "@/components/Modal";
import UploadWidget from "@/components/UploadWidget";
import { SAVE_SVG, IMAGE_SVG } from '@/utils/icons';

interface GlobalSetting {
    name: string;
    description: string;
    type: 'text' | 'number' | 'image' | 'color'; // assuming types
    data: any;
}

interface GlobalsMap {
    [key: string]: GlobalSetting;
}

export default function GlobalsPage() {
    const { notify } = useNotifications();
    const [activePickerKey, setActivePickerKey] = createSignal<string | null>(null);

    const [globals, { refetch }] = createResource(async () => {
        const res = await apiRequest('GET', '/api/globals');
        return (res.res || {}) as GlobalsMap;
    });

    const updateGlobal = async (key: string, value: any) => {
        const setting = globals()![key];
        const displayName = setting.name || key;

        let parsedValue = value;
        if (setting.type === 'number' || (setting.type !== 'text' && !isNaN(value) && value !== '')) {
             parsedValue = parseFloat(value);
        }

        try {
            await apiRequest('POST', `/api/globals/${key}`, { value: parsedValue });
            notify('Success', `Updated ${displayName}`, 'success');
            refetch();
        } catch (e: any) {
            notify('Error', `Failed to Update ${displayName}: ${e.message}`, 'error');
        }
    };

    return (
        <div class="glass-layout">
            <div class="glass-toolbar">
                 {/* AdminNavBar is handled by Layout */}
            </div>
            
            <div class="glass-table-container">
                <div class="table-responsive">
                    <table class="glass-table">
                        <thead>
                            <tr>
                                <th>Setting</th>
                                <th>Description</th>
                                <th>Value</th>
                                <th class="action-col">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <Show when={globals.loading}>
                                <tr><td colspan="4" class="loading-cell">Loading...</td></tr>
                            </Show>
                            <Show when={!globals.loading && Object.keys(globals() || {}).length === 0}>
                                <tr><td colspan="4" class="empty-cell">No settings found.</td></tr>
                            </Show>
                            <For each={Object.entries(globals() || {})}>
                                {([key, setting]) => (
                                    <tr class="global-row">
                                        <td data-label="Setting" class="primary-text"><strong>{setting.name || key}</strong></td>
                                        <td data-label="Description" class="description-cell">{setting.description}</td>
                                        <td data-label="Value">
                                            <Show when={setting.type === 'image'} fallback={
                                                <input 
                                                    type={setting.type === 'number' ? 'number' : 'text'} 
                                                    class="global-input modern-input" 
                                                    value={setting.data} 
                                                    onChange={(e) => updateGlobal(key, e.currentTarget.value)}
                                                />
                                            }>
                                                <div class="image-global-display">
                                                    <div 
                                                        class="image-preview-global" 
                                                        style={{ '--setting-url': `url('${setting.data || '/api/files/1/download?view=true'}')` }}
                                                        onClick={(e) => {
                                                            const el = e.currentTarget;
                                                            el.classList.toggle('preview-open');
                                                            const close = () => { el.classList.remove('preview-open'); document.removeEventListener('click', close); };
                                                            setTimeout(() => document.addEventListener('click', close), 0);
                                                        }}
                                                    >
                                                        <img src={setting.data || '/api/files/1/download?view=true'} class="uncropped-hover-preview" />
                                                    </div>
                                                </div>
                                            </Show>
                                        </td>
                                        <td data-label="Actions">
                                            <Show when={setting.type === 'image'} fallback={
                                                <button class="save-global-btn icon-btn" onClick={() => {
                                                    const input = document.querySelector(`.global-input[data-key="${key}"]`) as HTMLInputElement;
                                                    if(input) updateGlobal(key, input.value);
                                                }} title="Save" innerHTML={SAVE_SVG} />
                                            }>
                                                <button class="small-btn picker-btn" onClick={() => setActivePickerKey(key)} title="Change Image" innerHTML={IMAGE_SVG} />
                                            </Show>
                                        </td>
                                    </tr>
                                )}
                            </For>
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={!!activePickerKey()} onClose={() => setActivePickerKey(null)} title="Choose Image" maxWidth="800px">
                <UploadWidget 
                    selectMode="single"
                    autoUpload={true}
                    enableLibrary={true}
                    onImageSelect={({ id }) => {
                        if (activePickerKey() && id) {
                            updateGlobal(activePickerKey()!, id);
                            setActivePickerKey(null);
                        }
                    }}
                />
            </Modal>
        </div>
    );
}

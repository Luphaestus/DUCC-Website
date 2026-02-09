// todo clean up
import { createSignal, createResource, For, Show, onMount, createEffect } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import UploadWidget from "@/components/UploadWidget";
import { 
    ARROW_BACK_IOS_NEW_SVG, DELETE_SVG, ADD_SVG, 
    SHIELD_SVG, LOCAL_ACTIVITY_SVG, IMAGE_SVG 
} from '@/utils/icons';
import { debounce } from "@/utils/utils";

interface Tag {
    id?: number | string;
    name: string;
    color: string;
    description: string;
    min_difficulty: number | null;
    priority: number;
    join_policy: string;
    view_policy: string;
    image_id: number | null;
}

interface User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
}

export default function TagDetailPage() {
    const params = useParams();
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const id = () => params.id;
    const isNew = () => id() === 'new';

    const [tag, { mutate: setTag, refetch: refetchTag }] = createResource(id, async (tagId) => {
        if (tagId === 'new') return { 
            name: '', color: '#808080', description: '', 
            min_difficulty: null, priority: 0, 
            join_policy: 'open', view_policy: 'open', image_id: null 
        } as Tag;
        
        const res = await apiRequest('GET', '/api/tags');
        const found = res.data.find((t: any) => t.id == tagId);
        if (!found) throw new Error('Tag not found');
        return found as Tag;
    });

    const [whitelist, { refetch: refetchWhitelist }] = createResource(id, async (tagId) => {
        if (tagId === 'new') return [] as User[];
        const res = await apiRequest('GET', `/api/tags/${tagId}/whitelist`);
        return (res.data || []) as User[];
    });

    const [managers, { refetch: refetchManagers }] = createResource(id, async (tagId) => {
        if (tagId === 'new') return [] as User[];
        const res = await apiRequest('GET', `/api/tags/${tagId}/managers`);
        return (res.data || []) as User[];
    });

    const [allUsers] = createResource(async () => {
        const res = await apiRequest('GET', '/api/admin/users?limit=1000');
        return (res.users || []) as User[];
    });

    const [globalDefaultUrl] = createResource(async () => {
        const res = await apiRequest('GET', '/api/globals/DefaultEventImage');
        return res.res?.DefaultEventImage?.data || '/images/misc/ducc.png';
    });

    // --- Actions ---

    const handleSave = async (e?: Event) => {
        e?.preventDefault();
        const currentTag = tag();
        if (!currentTag) return;

        try {
            if (isNew()) {
                const res = await apiRequest('POST', '/api/tags', currentTag);
                notify('Success', 'Tag created', 'success');
                navigate(`/admin/tag/${res.id || res.data.id}`);
            } else {
                await apiRequest('PUT', `/api/tags/${id()}`, currentTag);
                notify('Success', 'Tag updated', 'success');
            }
        } catch (err: any) {
            notify('Error', err.message || 'Save failed', 'error');
        }
    };

    const debouncedAutoSave = debounce(() => {
        if (!isNew()) handleSave();
    }, 1000);

    const updateField = (key: keyof Tag, value: any) => {
        setTag({ ...tag()!, [key]: value });
        debouncedAutoSave();
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this tag?')) return;
        try {
            await apiRequest('DELETE', `/api/tags/${id()}`);
            notify('Success', 'Tag deleted', 'success');
            navigate('/admin/tags');
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    const handleAddUser = async (type: 'whitelist' | 'managers', userIdStr: string) => {
        const userId = parseInt(userIdStr.split(' - ')[0]);
        if (!userId || isNaN(userId)) return notify('Warning', 'Select a valid user', 'warning');

        try {
            await apiRequest('POST', `/api/tags/${id()}/${type}`, { userId });
            notify('Success', 'User added', 'success');
            if (type === 'whitelist') refetchWhitelist();
            else refetchManagers();
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    const handleRemoveUser = async (type: 'whitelist' | 'managers', userId: number) => {
        try {
            await apiRequest('DELETE', `/api/tags/${id()}/${type}/${userId}`);
            notify('Success', 'User removed', 'success');
            if (type === 'whitelist') refetchWhitelist();
            else refetchManagers();
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    return (
        <div class="glass-layout">
            <div class="admin-header-actions-proxy">
                {/* We can use a Portal or just render here if layout allows */}
            </div>

            <div class="panel">
                <div class="panel-header">
                    <h3>{isNew() ? 'Create New Tag' : 'Edit Tag'}</h3>
                    <div class="panel-actions">
                        <Show when={!isNew()}>
                            <button class="small-btn delete outline" onClick={handleDelete} title="Delete">
                                <span innerHTML={DELETE_SVG} /> Delete
                            </button>
                        </Show>
                    </div>
                </div>
                <div class="panel-content">
                    <form class="modern-form" onSubmit={handleSave}>
                        <Show when={tag()} fallback={<p>Loading...</p>}>
                            <div class="event-content-split">
                                <div class="event-details-section">
                                    <div class="grid-2-col">
                                        <label>Name 
                                            <input type="text" value={tag()!.name} onInput={e => updateField('name', e.currentTarget.value)} required placeholder="Tag Name" />
                                        </label>
                                        <label>Colour 
                                            <input type="color" value={tag()!.color} onInput={e => updateField('color', e.currentTarget.value)} required class="colour-input" />
                                        </label>
                                    </div>
                                    
                                    <label>Description 
                                        <textarea rows="3" value={tag()!.description} onInput={e => updateField('description', e.currentTarget.value)} placeholder="Tag description..."></textarea>
                                    </label>
                                    
                                    <div class="grid-2-col">
                                        <label>Min Difficulty Requirement 
                                            <input type="number" value={tag()!.min_difficulty ?? ''} onInput={e => updateField('min_difficulty', e.currentTarget.value === '' ? null : parseInt(e.currentTarget.value))} min="1" max="5" placeholder="Optional (1-5)" />
                                        </label>
                                        <label>Priority 
                                            <input type="number" value={tag()!.priority} onInput={e => updateField('priority', parseInt(e.currentTarget.value) || 0)} placeholder="Default 0" />
                                        </label>
                                    </div>

                                    <div class="grid-2-col">
                                        <label>Join Policy
                                            <select class="modern-select" value={tag()!.join_policy} onChange={e => updateField('join_policy', e.currentTarget.value)}>
                                                <option value="open">Open</option>
                                                <option value="whitelist">Whitelist Only</option>
                                                <option value="role">Role Only</option>
                                            </select>
                                        </label>
                                        <label>View Policy
                                            <select class="modern-select" value={tag()!.view_policy} onChange={e => updateField('view_policy', e.currentTarget.value)}>
                                                <option value="open">Open</option>
                                                <option value="whitelist">Whitelist Only</option>
                                                <option value="role">Role Only</option>
                                            </select>
                                        </label>
                                    </div>
                                </div>

                                <div class="event-image-section">
                                    <h3 class="section-header-modern">
                                        <span innerHTML={IMAGE_SVG} /> Default Event Image
                                    </h3>
                                    <UploadWidget 
                                        selectMode="single"
                                        autoUpload={true}
                                        defaultPreview={tag()!.image_id ? `/api/files/${tag()!.image_id}/download?view=true` : globalDefaultUrl()}
                                        onImageSelect={({ id }) => updateField('image_id', id)}
                                        onRemove={async () => {
                                            if (isNew()) {
                                                updateField('image_id', null);
                                                return true;
                                            }
                                            if (!confirm('Remove tag image?')) return false;
                                            try {
                                                await apiRequest('POST', `/api/tags/${id()}/reset-image`);
                                                updateField('image_id', null);
                                                return true;
                                            } catch (err: any) {
                                                notify('Error', err.message, 'error');
                                                return false;
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <Show when={isNew()}>
                                <div class="form-actions-footer">
                                    <button type="submit" class="wide-btn">Create</button>
                                </div>
                            </Show>
                        </Show>
                    </form>
                </div>
            </div>

            <Show when={!isNew()}>
                <div class="divider"></div>
                <div class="dual-grid">
                    {/* Managers */}
                    <div class="panel">
                        <div class="panel-header">
                            <h3><span innerHTML={SHIELD_SVG} /> Designated Managers</h3>
                        </div>
                        <div class="panel-content">
                            <p class="helper-text">Users allowed to manage events with this tag.</p>
                            <form class="inline-add-form" onSubmit={(e) => { e.preventDefault(); const input = e.currentTarget.querySelector('input')!; handleAddUser('managers', input.value); input.value = ''; }}>
                                <input list="users-datalist" placeholder="Search users..." />
                                <button type="submit" class="small-btn" innerHTML={ADD_SVG} />
                            </form>
                            <div class="glass-table-container">
                                <table class="glass-table">
                                    <thead><tr><th>Name</th><th>Email</th><th>Action</th></tr></thead>
                                    <tbody>
                                        <For each={managers()}>
                                            {u => (
                                                <tr>
                                                    <td>{u.first_name} {u.last_name}</td>
                                                    <td>{u.email}</td>
                                                    <td><button class="delete-icon-btn outline" onClick={() => handleRemoveUser('managers', u.id)} innerHTML={DELETE_SVG} /></td>
                                                </tr>
                                            )}
                                        </For>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Whitelist */}
                    <div class="panel">
                        <div class="panel-header">
                            <h3><span innerHTML={LOCAL_ACTIVITY_SVG} /> Whitelist Access</h3>
                        </div>
                        <div class="panel-content">
                            <p class="helper-text">Restricts event visibility/joining to specific users.</p>
                            <form class="inline-add-form" onSubmit={(e) => { e.preventDefault(); const input = e.currentTarget.querySelector('input')!; handleAddUser('whitelist', input.value); input.value = ''; }}>
                                <input list="users-datalist" placeholder="Search users..." />
                                <button type="submit" class="small-btn" innerHTML={ADD_SVG} />
                            </form>
                            <div class="glass-table-container">
                                <table class="glass-table">
                                    <thead><tr><th>Name</th><th>Email</th><th>Action</th></tr></thead>
                                    <tbody>
                                        <For each={whitelist()}>
                                            {u => (
                                                <tr>
                                                    <td>{u.first_name} {u.last_name}</td>
                                                    <td>{u.email}</td>
                                                    <td><button class="delete-icon-btn outline" onClick={() => handleRemoveUser('whitelist', u.id)} innerHTML={DELETE_SVG} /></td>
                                                </tr>
                                            )}
                                        </For>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </Show>

            <datalist id="users-datalist">
                <For each={allUsers()}>
                    {u => <option value={`${u.id} - ${u.first_name} ${u.last_name} (${u.email})`} />}
                </For>
            </datalist>
        </div>
    );
}

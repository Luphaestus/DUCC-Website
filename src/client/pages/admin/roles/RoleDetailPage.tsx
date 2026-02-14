// todo clean up
import { createSignal, createResource, For, Show } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { showConfirmModal } from "@/utils/modal";
import {
    ARROW_BACK_IOS_NEW_SVG, DELETE_SVG, SAVE_SVG, SHIELD_SVG
} from '@/utils/icons';
import { debounce } from "@/utils/utils";

interface Role {
    name: string;
    description: string;
    permissions: string[];
    exec_ranking: number;
}

interface PermissionDef {
    slug: string;
    key?: string;
}

import { TabNav } from "@/widgets/TabNav";

export default function RoleDetailPage() {
    const params = useParams();
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const id = () => params.id;
    const isNew = () => id() === 'new';

    const [role, { mutate: setRole, refetch: refetchRole }] = createResource(id, async (roleId) => {
        if (roleId === 'new') return { name: '', description: '', permissions: [], exec_ranking: 4 } as Role;
        return await apiRequest('GET', `/api/admin/roles/${roleId}`) as Role;
    });

    const [allPermissions] = createResource(async () => {
        return await apiRequest('GET', '/api/admin/roles/permissions') as PermissionDef[];
    });

    const [isDirty, setIsDirty] = createSignal(false);

    const handleSave = async (e?: Event) => {
        e?.preventDefault();
        const currentRole = role();
        if (!currentRole) return;

        // Backend expects 'execRanking' (camelCase) based on legacy code
        const payload = {
            ...currentRole,
            execRanking: currentRole.exec_ranking
        };

        try {
            if (isNew()) {
                await apiRequest('POST', '/api/admin/roles', payload);
                notify('Success', 'Role created', 'success');
                navigate('/admin/roles');
            } else {
                await apiRequest('PUT', `/api/admin/roles/${id()}`, payload);
                notify('Success', 'Role updated', 'success');
            }
            setIsDirty(false);
        } catch (err: any) {
            notify('Error', err.message || 'Save failed', 'error');
        }
    };

    const debouncedAutoSave = debounce(() => {
        if (!isNew()) handleSave();
    }, 1000);

    const updateField = (key: keyof Role, value: any) => {
        setRole({ ...role()!, [key]: value });
        setIsDirty(true);
        debouncedAutoSave();
    };

    const togglePermission = (slug: string) => {
        const currentPerms = role()?.permissions || [];
        const newPerms = currentPerms.includes(slug)
            ? currentPerms.filter(p => p !== slug)
            : [...currentPerms, slug];
        updateField('permissions', newPerms);
    };

    const handleDelete = async () => {
        const ok = await showConfirmModal('Delete Role', 'Are you sure you want to delete this role? This might affect many users.');
        if (!ok) return;
        try {
            await apiRequest('DELETE', `/api/admin/roles/${params.id}`);
            notify('Success', 'Role deleted', 'success');
            navigate('/admin/roles');
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    return (
        <div class="dashboard-container">
            <aside class="dashboard-sidebar">
                <TabNav class="vertical-sidebar">
                    <button class="nav-item" onClick={() => navigate('/admin/roles')}>
                        <span innerHTML={ARROW_BACK_IOS_NEW_SVG} /> Back to Roles
                    </button>
                    <div class="sidebar-spacer" style={{"border-top": "1px solid rgba(var(--pico-color-rgb), 0.1)", "margin": "0.5rem 0"}} />
                    
                    <button class="nav-item active">
                        <span innerHTML={SHIELD_SVG} /> Role Details
                    </button>

                    <Show when={!isNew()}>
                        <div class="sidebar-spacer" style={{"border-top": "1px solid rgba(var(--pico-color-rgb), 0.1)", "margin": "0.5rem 0"}} />
                        <button class="nav-item delete" onClick={handleDelete}>
                            <span innerHTML={DELETE_SVG} /> Delete Role
                        </button>
                    </Show>
                </TabNav>
            </aside>

            <main class="dashboard-content">
                <div class="glass-layout">
                    <div class="panel">
                        <div class="panel-header">
                            <h3 style="margin: 0;">Configuration</h3>
                        </div>
                        <div class="panel-content">
                            <form class="modern-form" onSubmit={handleSave}>
                                <Show when={role()} fallback={<p>Loading...</p>}>
                                    <div class="grid-2-col">
                                        <label class="form-label-top">Role Name
                                            <input type="text" value={role()!.name} onInput={e => updateField('name', e.currentTarget.value)} required class="full-width-input" placeholder="e.g. Moderator" />
                                        </label>
                                        <label class="form-label-top">Description
                                            <input type="text" value={role()!.description || ''} onInput={e => updateField('description', e.currentTarget.value)} class="full-width-input" placeholder="Role purpose" />
                                        </label>
                                        <label class="form-label-top">Exec Ranking
                                            <input type="number" value={role()!.exec_ranking || 4} onInput={e => updateField('exec_ranking', parseInt(e.currentTarget.value) || 4)} class="full-width-input" min="1" max="10" />
                                            <small>1 = Top (President), 2 = Important (VP), 4 = Standard</small>
                                        </label>
                                    </div>

                                    <h3>Permissions</h3>
                                    <div class="tag-cloud">
                                        <For each={allPermissions()}>
                                            {p => (
                                                <label class="checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={role()?.permissions.includes(p.slug)}
                                                        onChange={() => togglePermission(p.slug)}
                                                    /> {p.key || p.slug}
                                                </label>
                                            )}
                                        </For>
                                    </div>

                                    <Show when={isDirty() || isNew()}>
                                        <div class="floating-action-container">
                                            <button 
                                                type="submit" 
                                                class="floating-save-btn prominent-btn"
                                                title={isNew() ? 'Create Role' : 'Save Changes'}
                                            >
                                                <span innerHTML={SAVE_SVG} />
                                                <span class="btn-label">{isNew() ? 'Create' : 'Save'}</span>
                                            </button>
                                        </div>
                                    </Show>
                                </Show>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

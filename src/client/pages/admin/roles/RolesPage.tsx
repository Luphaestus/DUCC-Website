// todo clean up
import { createResource, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNavigate } from "@solidjs/router";
import { useNotifications } from "@/stores/notifications";
import Panel from "@/components/Panel";

interface Role {
    id: number;
    name: string;
    permissions: string[];
}

interface PermissionDef {
    id: number;
    slug: string;
    description: string;
}

export default function RolesPage() {
    const navigate = useNavigate();
    const { notify } = useNotifications();

    const [roles] = createResource(async () => {
        return await apiRequest('GET', '/api/admin/roles') as Role[];
    });

    const [permissions, { refetch: refetchPerms }] = createResource(async () => {
        return await apiRequest('GET', '/api/admin/roles/permissions') as PermissionDef[];
    });

    const handleSavePermission = async (id: number, description: string) => {
        try {
            await apiRequest('PUT', `/api/admin/permissions/${id}`, { description });
            notify('Success', 'Permission updated.', 'success');
            refetchPerms();
        } catch (e: any) {
            notify('Error', e.message, 'error');
        }
    };

    return (
        <div class="glass-layout">
            <div class="roles-sections">
                <Panel title="System Roles" action={
                    <button onClick={() => navigate('/admin/role/new')} class="small-btn primary">Create New Role</button>
                }>
                    <div class="table-responsive">
                        <table class="glass-table">
                            <thead><tr><th>Name</th><th>Permissions</th></tr></thead>
                            <tbody>
                                <Show when={roles.loading}>
                                    <tr><td colspan="2" class="loading-cell">Loading roles...</td></tr>
                                </Show>
                                <Show when={!roles.loading && roles()?.length === 0}>
                                    <tr><td colspan="2" class="empty-cell">No roles found.</td></tr>
                                </Show>
                                <For each={roles()}>
                                    {(role) => (
                                        <tr class="role-row clickable-row" onClick={() => navigate(`/admin/role/${role.id}`)}>
                                            <td data-label="Name" class="primary-text">{role.name}</td>
                                            <td data-label="Permissions">
                                                <div class="permission-tags">
                                                    <For each={role.permissions}>
                                                        {p => <span class="badge neutral">{p}</span>}
                                                    </For>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </For>
                            </tbody>
                        </table>
                    </div>
                </Panel>

                <Panel title="Permission Definitions" class="mt-6">
                    <div class="table-responsive">
                        <table class="glass-table">
                            <thead><tr><th>Slug</th><th>Description</th><th class="text-right">Action</th></tr></thead>
                            <tbody>
                                <Show when={permissions.loading}>
                                    <tr><td colspan="3" class="loading-cell">Loading permissions...</td></tr>
                                </Show>
                                <For each={permissions()}>
                                    {(p) => (
                                        <tr>
                                            <td class="primary-text"><code>{p.slug}</code></td>
                                            <td>
                                                <input 
                                                    type="text" 
                                                    class="mini-input" 
                                                    value={p.description || ''} 
                                                    onBlur={(e) => handleSavePermission(p.id, e.currentTarget.value)}
                                                    placeholder="No description" 
                                                />
                                            </td>
                                            <td class="text-right">
                                                <button class="small-btn primary mini-btn">Save</button>
                                            </td>
                                        </tr>
                                    )}
                                </For>
                            </tbody>
                        </table>
                    </div>
                </Panel>
            </div>
        </div>
    );
}

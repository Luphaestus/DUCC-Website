import { createSignal, createResource, For, Show, createMemo } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { 
    POOL_SVG, ADD_SVG, PERSON_SVG, EDIT_SVG, 
    BOLT_SVG, ID_CARD_SVG, SHIELD_SVG, CLOSE_SVG 
} from '@/utils/icons';
import Panel from "@/components/Panel";

export default function ProfileTab(props: { user: any, permissions: string[], canManageUsers: boolean, isExec: boolean, refetchUser: () => void }) {
    const { notify } = useNotifications();
    const canManageSwims = () => props.permissions.includes('swims.manage');
    
    const [isEditing, setIsEditing] = createSignal(false);
    const [allRoles] = createResource(async () => await apiRequest('GET', '/api/admin/roles'));
    const [allPerms] = createResource(async () => await apiRequest('GET', '/api/admin/roles/permissions'));
    const [colleges] = createResource(async () => await apiRequest('GET', '/api/colleges'));

    const handleAddRole = async (roleId: string) => {
        if (!roleId) return;
        try {
            await apiRequest('POST', `/api/admin/user/${props.user.id}/role`, { roleId });
            notify('Success', 'Role added', 'success');
            props.refetchUser();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    const handleRemoveRole = async (roleId: number) => {
        try {
            await apiRequest('DELETE', `/api/admin/user/${props.user.id}/role/${roleId}`);
            notify('Success', 'Role removed', 'success');
            props.refetchUser();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    const handleAddPerm = async (permissionId: string) => {
        if (!permissionId) return;
        try {
            await apiRequest('POST', `/api/admin/user/${props.user.id}/permission`, { permissionId });
            notify('Success', 'Permission added', 'success');
            props.refetchUser();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    const handleRemovePerm = async (permId: number) => {
        try {
            await apiRequest('DELETE', `/api/admin/user/${props.user.id}/permission/${permId}`);
            notify('Success', 'Permission removed', 'success');
            props.refetchUser();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    const handleSaveProfile = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data: any = Object.fromEntries(formData.entries());
        // Simple conversion for checkboxes
        data.is_member = !!formData.get('is_member');
        data.is_instructor = !!formData.get('is_instructor');
        
        try {
            await apiRequest('POST', `/api/admin/user/${props.user.id}/elements`, data);
            notify('Success', 'Profile updated', 'success');
            setIsEditing(false);
            props.refetchUser();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    const handleLogAction = async (type: 'swims' | 'booties') => {
        try {
            await apiRequest('POST', `/api/user/${props.user.id}/${type}`, { count: 1 });
            notify('Success', 'Logged successfully', 'success');
            props.refetchUser();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    return (
        <div class="dashboard-section active">
            <div class="dual-grid">
                <Panel title="Account Balance">
                    <span class={`value-amount ${props.user.balance >= 0 ? 'positive' : 'negative'}`}>£{Number(props.user.balance || 0).toFixed(2)}</span>
                </Panel>
                <Panel title="Member Status">
                    <span class={`value-amount ${props.user.is_member ? 'positive' : ''}`}>{props.user.is_member ? 'Active Member' : (props.user.free_sessions || 0)}</span>
                    {!props.user.is_member && <small> free sessions remaining</small>}
                </Panel>
            </div>

            {/* Stats */}
            <Panel 
                class="mt-4"
                title="Swimming Stats" 
                icon={POOL_SVG}
                action={
                    <Show when={canManageSwims()}>
                        <div class="panel-actions">
                            <button class="small-btn" onClick={() => handleLogAction('swims')}><span innerHTML={ADD_SVG} /> Log Swim</button>
                            <button class="small-btn secondary" onClick={() => handleLogAction('booties')}><span innerHTML={ADD_SVG} /> Log Bootie</button>
                        </div>
                    </Show>
                }
            >
                <div class="stats-grid">
                    <div class="stat-item"><span class="stat-value">{props.user.swimmer_stats?.yearly?.swims || 0}</span><span class="stat-label">Yearly Swims</span></div>
                    <div class="stat-item"><span class="stat-value">{props.user.swimmer_stats?.yearly?.booties || 0}</span><span class="stat-label">Yearly Booties</span></div>
                    <div class="stat-item"><span class="stat-value">{props.user.swimmer_stats?.allTime?.swims || 0}</span><span class="stat-label">Total Swims</span></div>
                    <div class="stat-item"><span class="stat-value">{props.user.swimmer_stats?.allTime?.booties || 0}</span><span class="stat-label">Total Booties</span></div>
                </div>
            </Panel>

            <div class="dual-grid mt-4">
                <Panel 
                    title="Account Details" 
                    icon={PERSON_SVG}
                    action={
                        <Show when={props.permissions.includes('user.manage.advanced')}>
                            <button class="small-btn secondary" onClick={() => setIsEditing(!isEditing())}><span innerHTML={EDIT_SVG} /> Edit</button>
                        </Show>
                    }
                >
                    <Show when={isEditing()} fallback={
                        <div class="info-rows">
                            <div class="info-row-modern"><span class="label">Email</span><span class="value">{props.user.email}</span></div>
                            <div class="info-row-modern"><span class="label">Phone</span><span class="value">{props.user.phone_number || 'N/A'}</span></div>
                        </div>
                    }>
                        <form class="modern-form" onSubmit={handleSaveProfile}>
                            <label>Email <input name="email" value={props.user.email} /></label>
                            <label>Phone <input name="phone_number" value={props.user.phone_number || ''} /></label>
                            <Show when={props.canManageUsers}>
                                <div class="grid-2-col">
                                    <label>Free Sessions <input type="number" name="free_sessions" value={props.user.free_sessions} /></label>
                                    <label>Swims (Total) <input type="number" name="swims" value={props.user.swims} /></label>
                                </div>
                                <label><input type="checkbox" name="is_member" checked={props.user.is_member} /> Is Member</label>
                            </Show>
                            <div class="form-actions mt-2">
                                <button type="submit" class="small-btn">Save</button>
                                <button type="button" class="small-btn secondary outline" onClick={() => setIsEditing(false)}>Cancel</button>
                            </div>
                        </form>
                    </Show>
                </Panel>

                <Panel title="Capabilities" icon={BOLT_SVG}>
                    <div class="role-toggle">
                        <div class="role-info"><h4>Instructor Status</h4></div>
                        <span class={`badge ${props.user.is_instructor ? 'primary' : 'neutral'}`}>{props.user.is_instructor ? 'Yes' : 'No'}</span>
                    </div>
                    <div class="difficulty-control mt-4">
                        <label>Difficulty Level: {props.user.difficulty_level || 1}</label>
                        <input type="range" min="1" max="5" value={props.user.difficulty_level || 1} disabled />
                    </div>
                </Panel>
            </div>

            {/* RBAC */}
            <div class="dual-grid mt-4">
                <Panel title="System Roles" icon={ID_CARD_SVG}>
                    <div class="inline-add-form mb-3">
                        <select onChange={e => handleAddRole(e.currentTarget.value)}>
                            <option value="">Add Role...</option>
                            <For each={allRoles()}>
                                {r => <option value={r.id}>{r.name}</option>}
                            </For>
                        </select>
                    </div>
                    <div class="tags-cloud">
                        <For each={props.user.roles}>
                            {r => (
                                <span class="tag-chip primary">{r.name} <button class="delete-icon-btn" onClick={() => handleRemoveRole(r.id)} innerHTML={CLOSE_SVG} /></span>
                            )}
                        </For>
                    </div>
                </Panel>
                <Panel title="Direct Permissions" icon={SHIELD_SVG}>
                    <div class="inline-add-form mb-3">
                        <select onChange={e => handleAddPerm(e.currentTarget.value)}>
                            <option value="">Select Permission...</option>
                            <For each={allPerms()}>
                                {p => <option value={p.id}>{p.slug}</option>}
                            </For>
                        </select>
                    </div>
                    <div class="tags-cloud">
                        <For each={props.user.direct_permissions}>
                            {p => (
                                <span class="tag-chip neutral">{p.slug} <button class="delete-icon-btn" onClick={() => handleRemovePerm(p.id)} innerHTML={CLOSE_SVG} /></span>
                            )}
                        </For>
                    </div>
                </Panel>
            </div>
        </div>
    );
}

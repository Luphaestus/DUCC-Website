import { createResource, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { 
    BOLT_SVG, ID_CARD_SVG, SHIELD_SVG, CLOSE_SVG, UPLOAD_SVG 
} from '@/utils/icons';
import Panel from "@/components/Panel";
import Avatar from "@/components/Avatar";
import { UploadWidget } from "@/widgets/upload/UploadWidget";
import { onMount } from "solid-js";

export default function PermissionsTab(props: { user: any, refetchUser: () => void }) {
    const { notify } = useNotifications();
    
    const [allRoles] = createResource(async () => await apiRequest('GET', '/api/admin/roles'));
    const [allPerms] = createResource(async () => await apiRequest('GET', '/api/admin/roles/permissions'));

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

    let uploadWidget: UploadWidget | null = null;
    onMount(() => {
        uploadWidget = new UploadWidget(`admin-avatar-upload-${props.user.id}`, {
            mode: 'inline',
            enableLibrary: false,
            enableUrl: false,
            showActions: false,
            showPreview: false,
            enableCrop: true,
            onImageSelect: async ({ id }) => {
                if (!id) return;
                try {
                    await apiRequest('POST', `/api/admin/user/${props.user.id}/elements`, { profile_picture_id: id });
                    notify('Success', 'Profile picture overridden.', 'success');
                    props.refetchUser();
                } catch (err: any) {
                    notify('Error', err.message, 'error');
                }
            }
        });
    });

    return (
        <div class="dashboard-section active">
            <Panel title="Profile Picture Override" icon={ID_CARD_SVG}>
                <div class="profile-avatar-row">
                    <div class="profile-picture-container" onClick={() => uploadWidget?.inputEl.click()}>
                        <Avatar user={props.user} classes="large" />
                        <div class="avatar-overlay" innerHTML={UPLOAD_SVG}></div>
                    </div>
                    <div class="profile-avatar-controls">
                        <p>Admins can override the user's profile picture by clicking the avatar.</p>
                        <div id={`admin-avatar-upload-${props.user.id}`} style="display: none;"></div>
                    </div>
                </div>
            </Panel>

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
                <Panel title="Direct Permission Overrides" icon={SHIELD_SVG}>
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

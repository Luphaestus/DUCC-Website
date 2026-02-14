// todo clean up
import { createResource, For, Show, createMemo, createSignal } from "solid-js";
import { apiRequest } from "@/utils/api";
import { getContrastColour } from "@/widgets/Tag";
import { useNotifications } from "@/stores/notifications";
import {
    ID_CARD_SVG, SHIELD_SVG, CLOSE_SVG, LOCAL_ACTIVITY_SVG, LOCK_SVG,
    WARNING_SVG, PERSON_OFF_SVG, GAVEL_SVG
} from '@/utils/icons';
import Panel from "@/components/Panel";
import Modal from "@/components/Modal";
import LiquidButton from "@/components/LiquidButton";
import { triggerExecGoodbye } from "@/stores/presidentGoodbye";

export default function AccessTab(props: { user: any, refetchUser: () => void }) {
    const { notify } = useNotifications();
    const [hoveredRole, setHoveredRole] = createSignal<number | null>(null);
    const [isPresidentModalOpen, setIsPresidentModalOpen] = createSignal(false);
    const [presidentRoleId, setPresidentRoleId] = createSignal<number | null>(null);
    const [password, setPassword] = createSignal("");
    const [isSubmitting, setIsSubmitting] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);

    // Permissions & Roles Data
    const [allRoles] = createResource(async () => await apiRequest('GET', '/api/admin/roles'));
    const [allPerms] = createResource(async () => await apiRequest('GET', '/api/admin/roles/permissions'));

    // Calculate inherited permissions from assigned roles
    const inheritedPermSlugs = createMemo(() => {
        const roles = allRoles();
        const userRoles = props.user.roles || [];
        if (!roles || !userRoles.length) return new Set<string>();

        const slugs = new Set<string>();
        for (const userRole of userRoles) {
            const roleDef = roles.find((r: any) => r.id === userRole.id);
            if (roleDef && roleDef.permissions) {
                roleDef.permissions.forEach((p: string) => slugs.add(p));
            }
        }
        return slugs;
    });

    // Tags Data
    const [tagsData, { refetch: refetchTags }] = createResource(
        () => props.user.id,
        async (id) => {
            const [allTagsRes, whitelistedRes] = await Promise.all([
                apiRequest('GET', '/api/tags'),
                apiRequest('GET', `/api/user/${id}/tags?t=${Date.now()}`)
            ]);
            return {
                allTags: allTagsRes.data || [],
                whitelisted: whitelistedRes || []
            };
        }
    );

    // Roles Handlers
    const handleAddRole = async (roleId: string | number) => {
        if (!roleId) return;

        // Check if role is President
        const roles = allRoles();
        const role = roles?.find((r: any) => r.id === roleId);

        if (role?.name === 'President') {
            setPresidentRoleId(Number(roleId));
            setIsPresidentModalOpen(true);
            return;
        }

        try {
            await apiRequest('POST', `/api/admin/user/${props.user.id}/role`, { roleId: String(roleId) });
            await props.refetchUser();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    const confirmPresidentTransfer = async () => {
        if (!presidentRoleId() || !password()) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await apiRequest('POST', `/api/admin/user/${props.user.id}/role`, {
                roleId: String(presidentRoleId()),
                password: password()
            });
            notify('Success', 'Presidential role transferred.', 'success');
            triggerExecGoodbye(status.user, 'President');
            closePresidentModal();
        } catch (e: any) {
            setError(e.message || "An unexpected error occurred");
            setPassword("");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveRole = async (roleId: string | number) => {
        try {
            await apiRequest('DELETE', `/api/admin/user/${props.user.id}/role/${roleId}`);
            await props.refetchUser();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    // Permissions Handlers
    const handleAddPerm = async (permissionId: string | number) => {
        if (!permissionId) return;
        try {
            await apiRequest('POST', `/api/admin/user/${props.user.id}/permission`, { permissionId: String(permissionId) });
            await props.refetchUser();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    const handleRemovePerm = async (permId: string | number) => {
        try {
            await apiRequest('DELETE', `/api/admin/user/${props.user.id}/permission/${permId}`);
            await props.refetchUser();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    // Tags Handlers
    const toggleWhitelist = async (tagId: number, isAdding: boolean) => {
        try {
            if (isAdding) await apiRequest('POST', `/api/tags/${tagId}/whitelist`, { userId: props.user.id });
            else await apiRequest('DELETE', `/api/tags/${tagId}/whitelist/${props.user.id}`);
            await refetchTags();
        } catch (e) { notify('Error', 'Update failed', 'error'); }
    };

    const toggleManaged = async (tagId: number, isAdding: boolean) => {
        try {
            if (isAdding) await apiRequest('POST', `/api/admin/user/${props.user.id}/managed_tag`, { tagId });
            else await apiRequest('DELETE', `/api/admin/user/${props.user.id}/managed_tag/${tagId}`);
            await props.refetchUser();
        } catch (e) { notify('Error', 'Update failed', 'error'); }
    };

    const closePresidentModal = () => {
        setIsPresidentModalOpen(false);
        setPassword("");
        setPresidentRoleId(null);
        setError(null);
    };

    return (
        <div class="dashboard-section active">
            <Modal
                isOpen={isPresidentModalOpen()}
                onClose={closePresidentModal}
                title="Transfer Presidency"
                maxWidth="600px"
                footer={
                    <>
                        <LiquidButton class="secondary outline" onClick={closePresidentModal} borderRadius={12}>Cancel</LiquidButton>
                        <LiquidButton
                            class="error"
                            onClick={confirmPresidentTransfer}
                            borderRadius={12}
                            disabled={!password() || isSubmitting()}
                        >
                            {isSubmitting() ? 'Processing...' : 'Confirm Transfer'}
                        </LiquidButton>
                    </>
                }
            >
                <div class="presidential-warning-container">
                    <div class="warning-hero">
                        <span class="warning-icon" innerHTML={WARNING_SVG}></span>
                        <h3>Critical Action Required</h3>
                    </div>

                    <p>You are about to transfer the <strong>President</strong> role to <strong>{props.user.first_name} {props.user.last_name}</strong>. This is a destructive action that triggers a club-wide handover:</p>

                    <ul class="warning-list">
                        <li>
                            <span class="list-icon" innerHTML={PERSON_OFF_SVG}></span>
                            <div>
                                <strong>Global Role Reset:</strong> All existing roles and permissions for EVERY user in the club will be wiped.
                            </div>
                        </li>
                        <li>
                            <span class="list-icon" innerHTML={GAVEL_SVG}></span>
                            <div>
                                <strong>Committee Archival:</strong> The current Executive Committee will be moved to archives.
                            </div>
                        </li>
                        <li>
                            <span class="list-icon" innerHTML={ID_CARD_SVG}></span>
                            <div>
                                <strong>Privacy Reset:</strong> Personal data (medical info, addresses) for users who did not opt for long-term storage will be cleared for the new academic cycle.
                            </div>
                        </li>
                    </ul>

                    <div class="password-confirmation">
                        <label>
                            Enter your password to authorize this transfer:
                            <input
                                type="password"
                                value={password()}
                                onInput={(e) => setPassword(e.currentTarget.value)}
                                placeholder="Current President's Password"
                                aria-invalid={!!error() || undefined}
                                autofocus
                            />
                        </label>
                        <Show when={error()}>
                            <small class="error-text" style="color: var(--pico-error-color);">{error()}</small>
                        </Show>
                    </div>
                </div>
            </Modal>

            <div class="dual-grid">
                <Panel title="System Roles" icon={ID_CARD_SVG}>
                    <p class="helper-text">Assign broad functional roles to this user.</p>
                    <Show when={allRoles()} fallback={<p>Loading roles...</p>}>
                        {(roles) => (
                            <div class="tags-selection-grid">
                                <For each={roles()}>
                                    {role => {
                                        const isActive = createMemo(() => (props.user.roles || []).some((r: any) => r.id === role.id));
                                        return (
                                            <div
                                                class="tag-badge"
                                                classList={{ selected: isActive(), 'tag-badge-style': true }}
                                                style={{ "--tag-colour": "var(--pico-primary)", "--tag-text-colour": "var(--pico-primary-inverse)" }}
                                                onClick={() => (isActive() && role.name !== 'President') ? handleRemoveRole(role.id) : handleAddRole(role.id)}
                                                onMouseEnter={() => setHoveredRole(role.id)}
                                                onMouseLeave={() => setHoveredRole(null)}
                                            >
                                                {role.name}
                                            </div>
                                        );
                                    }}
                                </For>
                            </div>
                        )}
                    </Show>
                </Panel>
                <Panel title="Direct Permissions" icon={SHIELD_SVG}>
                    <p class="helper-text">Granular permissions. Inherited permissions cannot be removed here.</p>
                    <div class="tags-selection-grid">
                        <For each={allPerms()}>
                            {perm => {
                                const isDirect = createMemo(() => (props.user.direct_permissions || []).some((p: any) => p.id === perm.id));
                                const isInherited = createMemo(() => inheritedPermSlugs().has(perm.slug));
                                const isActive = createMemo(() => isDirect() || isInherited());
                                const isHoveredInherited = createMemo(() => {
                                    const hr = hoveredRole();
                                    if (!hr) return false;
                                    const roleDef = allRoles()?.find((r: any) => r.id === hr);
                                    return roleDef?.permissions?.includes(perm.slug);
                                });

                                return (
                                    <div
                                        class="tag-badge"
                                        classList={{
                                            selected: isActive(),
                                            inherited: isInherited(),
                                            'tag-badge-style': isHoveredInherited() || isActive()
                                        }}
                                        style={{
                                            "--tag-colour": isHoveredInherited() ? "var(--pico-primary)" : (isActive() ? (isInherited() ? "rgba(var(--pico-color-rgb), 0.1)" : "var(--pico-color)") : undefined),
                                            "--tag-text-colour": isHoveredInherited() ? "var(--pico-primary-inverse)" : undefined,
                                            "border-color": isHoveredInherited() ? "var(--pico-primary)" : "var(--pico-color)",
                                            "cursor": isInherited() ? "not-allowed" : "pointer",
                                            "opacity": (hoveredRole() && !isHoveredInherited() && isActive()) ? 0.5 : 1,
                                            "transition": "all 0.2s ease"
                                        } as any}
                                        onClick={() => {
                                            if (isInherited()) return;
                                            isDirect() ? handleRemovePerm(perm.id) : handleAddPerm(perm.id);
                                        }}
                                        title={isInherited() ? "Inherited from a role" : perm.description}
                                    >
                                        <Show when={isInherited()}>
                                            <span class="lock-icon" innerHTML={LOCK_SVG} style="width: 0.8em; height: 0.8em; margin-right: 0.2rem; display: flex; align-items: center;"></span>
                                        </Show>
                                        &nbsp;{perm.slug}
                                    </div>
                                );
                            }}
                        </For>
                    </div>
                </Panel>
            </div>

            <Show when={tagsData()}>
                {res => (
                    <div class="dual-grid">
                        <Panel title="Whitelisted Tags" icon={LOCAL_ACTIVITY_SVG}>
                            <p class="helper-text">Tags this user is explicitly whitelisted for.</p>
                            <div class="tags-selection-grid">
                                <For each={res().allTags}>
                                    {tag => {
                                        const isActive = createMemo(() => res().whitelisted.some((t: any) => t.id === tag.id));
                                        return (
                                            <div
                                                class="tag-badge"
                                                classList={{ selected: isActive(), 'tag-badge-style': true }}
                                                style={{ "--tag-colour": tag.color || "var(--pico-primary)", "--tag-text-colour": getContrastColour(tag.color || '') }}
                                                onClick={() => toggleWhitelist(tag.id, !isActive())}
                                            >
                                                {tag.name}
                                            </div>
                                        );
                                    }}
                                </For>
                            </div>
                        </Panel>
                        <Panel title="Managed Tags (Scoped)" icon={SHIELD_SVG}>
                            <p class="helper-text">Tags this user can manage events for.</p>
                            <div class="tags-selection-grid">
                                <For each={res().allTags}>
                                    {tag => {
                                        const isActive = createMemo(() => (props.user.direct_managed_tags || []).some((t: any) => t.id === tag.id));
                                        return (
                                            <div
                                                class="tag-badge"
                                                classList={{ selected: isActive(), 'tag-badge-style': true }}
                                                style={{ "--tag-colour": tag.color || "var(--pico-primary)", "--tag-text-colour": getContrastColour(tag.color || '') }}
                                                onClick={() => toggleManaged(tag.id, !isActive())}
                                            >
                                                {tag.name}
                                            </div>
                                        );
                                    }}
                                </For>
                            </div>
                        </Panel>
                    </div>
                )}
            </Show>
        </div>
    );
}

import { createSignal, createResource, Show, For } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import Panel from "@/components/Panel";
import { FaSolidXmark, FaSolidPlus, FaSolidChevronDown, FaSolidChevronUp } from 'solid-icons/fa'; // Updated import
import { showConfirmModal } from "@/utils/modal";

export default function InvitationsPage() {
    const { notify } = useNotifications();
    const [isInviting, setIsInviting] = createSignal(false);
    const [isMember, setIsMember] = createSignal(false);
    const [selectedRoles, setSelectedRoles] = createSignal<Set<number>>(new Set());
    const [selectedPerms, setSelectedPerms] = createSignal<Set<number>>(new Set());
    const [selectedTags, setSelectedTags] = createSignal<Set<number>>(new Set());
    const [showRoles, setShowRoles] = createSignal(false);
    const [showPermissions, setShowPermissions] = createSignal(false);
    const [showTags, setShowTags] = createSignal(false);

    const [invitations, { refetch }] = createResource(async () => {
        const res = await apiRequest('GET', '/api/admin/invitations');
        return res;
    });

    const [roles] = createResource(async () => await apiRequest('GET', '/api/admin/roles'));
    const [perms] = createResource(async () => await apiRequest('GET', '/api/admin/roles/permissions'));
    const [tags] = createResource(async () => {
        const res = await apiRequest('GET', '/api/tags');
        return res.data || [];
    });

    const toggleSelection = (id: number, signal: any, setter: any) => {
        const next = new Set(signal());
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setter(next);
    };

    const handleInvite = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const email = formData.get('email') as string;

        const settings = {
            is_member: isMember(),
            roles: Array.from(selectedRoles()),
            permissions: Array.from(selectedPerms()),
            tags: Array.from(selectedTags())
        };

        const sendInvite = async (force = false) => {
            setIsInviting(true);
            try {
                await apiRequest('POST', '/api/admin/invitations', { email, force, settings });
                notify('Success', 'Invitation sent successfully.', 'success');
                form.reset();
                setIsMember(false);
                setSelectedRoles(new Set<number>());
                setSelectedPerms(new Set<number>());
                setSelectedTags(new Set<number>());
                refetch();
            } catch (err: any) {
                if (err.status === 409 && err.message.includes('pending')) {
                    if (await showConfirmModal(
                        'Invitation Already Pending',
                        'There is already a pending invitation for this email. Sending a new one will invalidate the previous link. Are you sure?'
                    )) {
                        await sendInvite(true);
                        return;
                    }
                } else {
                    notify('Error', err.message, 'error');
                }
            } finally {
                setIsInviting(false);
            }
        };

        await sendInvite();
    };

    const handleDelete = async (id: number) => {
        if (await showConfirmModal('Delete Invitation?', 'This will invalidate the signup link.')) {
            try {
                await apiRequest('DELETE', `/api/admin/invitations/${id}`);
                notify('Success', 'Invitation deleted.', 'success');
                refetch();
            } catch (err: any) {
                notify('Error', err.message, 'error');
            }
        }
    };

    return (
        <div class="glass-layout invitations-page">
            <Panel title="Send New Invitation" class="glass-panel" style={{ "margin-bottom": "2rem" }}>
                <form onSubmit={handleInvite} class="modern-form">
                    <div class="form-row email-row">
                        <div style={{ "flex": "1" }}>
                            <label>Email Address</label>
                            <input
                                name="email"
                                type="email"
                                placeholder="Email address to invite"
                                required
                                disabled={isInviting()}
                            />
                        </div>
                    </div>

                    <div class="invitation-settings">
                        <div class="setting-group invite-member-row preapprove-toggle-card">
                            <div class="preapprove-copy">
                                <span class="preapprove-title">Pre-approve as Member</span>
                                <small class="preapprove-subtitle">Automatically grant membership status when the invite is used.</small>
                            </div>
                            <label class="preapprove-switch" aria-label="Toggle pre-approve as member">
                                <input type="checkbox" checked={isMember()} onChange={e => setIsMember(e.currentTarget.checked)} />
                                <span class="preapprove-slider"></span>
                            </label>
                        </div>

                        <div class="invite-settings-stack">
                            <div class="setting-col">
                                <div class="collapsible-setting-header">
                                    <label>Predefined Roles</label>
                                    <button
                                        type="button"
                                        class="small-btn secondary outline"
                                        onClick={() => setShowRoles((value) => !value)}
                                    >
                                        <Show when={showRoles()} fallback={<><FaSolidChevronDown /> Show</>}>
                                            <><FaSolidChevronUp /> Hide</>
                                        </Show>
                                    </button>
                                </div>
                                <Show when={showRoles()}>
                                    <div class="tags-selection-grid mini">
                                        <For each={roles() || []}>
                                            {role => (
                                                <div
                                                    class="tag-badge tag-badge-style"
                                                    classList={{ selected: selectedRoles().has(role.id) }}
                                                    onClick={() => toggleSelection(role.id, selectedRoles, setSelectedRoles)}
                                                >
                                                    {role.name}
                                                </div>
                                            )}
                                        </For>
                                    </div>
                                </Show>
                            </div>
                            <div class="setting-col">
                                <div class="collapsible-setting-header">
                                    <label>Predefined Permissions</label>
                                    <button
                                        type="button"
                                        class="small-btn secondary outline"
                                        onClick={() => setShowPermissions((value) => !value)}
                                    >
                                        <Show when={showPermissions()} fallback={<><FaSolidChevronDown /> Show</>}>
                                            <><FaSolidChevronUp /> Hide</>
                                        </Show>
                                    </button>
                                </div>
                                <Show when={showPermissions()}>
                                    <div class="tags-selection-grid mini">
                                        <For each={perms() || []}>
                                            {perm => (
                                                <div
                                                    class="tag-badge tag-badge-style"
                                                    classList={{ selected: selectedPerms().has(perm.id) }}
                                                    onClick={() => toggleSelection(perm.id, selectedPerms, setSelectedPerms)}
                                                >
                                                    {perm.slug}
                                                </div>
                                            )}
                                        </For>
                                    </div>
                                </Show>
                            </div>
                            <div class="setting-col tags-setting-group">
                                <div class="collapsible-setting-header">
                                    <label>Predefined Tags (Whitelist)</label>
                                    <button
                                        type="button"
                                        class="small-btn secondary outline"
                                        onClick={() => setShowTags((value) => !value)}
                                    >
                                        <Show when={showTags()} fallback={<><FaSolidChevronDown /> Show</>}>
                                            <><FaSolidChevronUp /> Hide</>
                                        </Show>
                                    </button>
                                </div>
                                <Show when={showTags()}>
                                    <div class="tags-selection-grid mini">
                                        <For each={tags() || []}>
                                            {tag => (
                                                <div
                                                    class="tag-badge tag-badge-style"
                                                    classList={{ selected: selectedTags().has(tag.id) }}
                                                    style={{ "--tag-colour": tag.color }}
                                                    onClick={() => toggleSelection(tag.id, selectedTags, setSelectedTags)}
                                                >
                                                    {tag.name}
                                                </div>
                                            )}
                                        </For>
                                    </div>
                                </Show>
                            </div>
                        </div>
                    </div>

                    <p class="small-text invite-help-text">
                        Invitations allow people without a @durham.ac.uk email to sign up.
                        Predefined settings will be applied automatically when they create their account.
                    </p>

                    <div class="invite-submit-row">
                        <button type="submit" class="primary" disabled={isInviting()}>
                            {isInviting() ? 'Sending...' : <><FaSolidPlus /> Send Invitation</>}
                        </button>
                    </div>
                </form>
            </Panel>

            <Panel title="Pending & Past Invitations" class="glass-panel">
                <div class="glass-table-container">
                    <table class="glass-table">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Invited By</th>
                                <th>Sent At</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <Show when={!invitations.loading && (invitations() || []).length === 0}>
                                <tr><td colspan="5" class="empty-cell">No invitations found.</td></tr>
                            </Show>
                            <For each={invitations() || []}>
                                {(invite) => (
                                    <tr>
                                        <td>{invite.email}</td>
                                        <td>{invite.inviter_first_name} {invite.inviter_last_name}</td>
                                        <td>{new Date(invite.created_at).toLocaleString()}</td>
                                        <td>
                                            <span class={`status-tag ${invite.used_at ? 'success' : 'warning'}`}>
                                                {invite.used_at ? 'Joined' : 'Pending'}
                                            </span>
                                        </td>
                                        <td>
                                            <Show when={!invite.used_at}>
                                                <button
                                                    class="small-btn icon-only delete"
                                                    onClick={() => handleDelete(invite.id)}
                                                ><FaSolidXmark /></button>
                                            </Show>
                                        </td>
                                    </tr>
                                )}
                            </For>
                        </tbody>
                    </table>
                </div>
            </Panel>
        </div>
    );
}

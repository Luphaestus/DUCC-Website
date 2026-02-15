import { createSignal, createResource, Show, For } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import Panel from "@/components/Panel";
import { CLOSE_SVG, ADD_SVG } from '@/utils/icons';
import { showConfirmModal } from "@/utils/modal";

export default function InvitationsPage() {
    const { notify } = useNotifications();
    const [isInviting, setIsInviting] = createSignal(false);

    const [invitations, { refetch }] = createResource(async () => {
        const res = await apiRequest('GET', '/api/admin/invitations');
        return res;
    });

    const handleInvite = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const email = formData.get('email') as string;

        setIsInviting(true);
        try {
            await apiRequest('POST', '/api/admin/invitations', { email });
            notify('Success', 'Invitation sent successfully.', 'success');
            form.reset();
            refetch();
        } catch (err: any) {
            notify('Error', err.message, 'error');
        } finally {
            setIsInviting(false);
        }
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
                <form onSubmit={handleInvite} class="modern-form inline-form">
                    <div class="form-row">
                        <input 
                            name="email" 
                            type="email" 
                            placeholder="Email address to invite" 
                            required 
                            disabled={isInviting()}
                        />
                        <button type="submit" class="primary" disabled={isInviting()}>
                            {isInviting() ? 'Sending...' : 'Send Invitation'}
                        </button>
                    </div>
                    <p class="small-text" style={{ "margin-top": "0.5rem" }}>
                        Invitations allow people without a @durham.ac.uk email to sign up.
                    </p>
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
                                                    innerHTML={CLOSE_SVG}
                                                />
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

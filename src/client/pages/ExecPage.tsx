import { createSignal, createResource, onMount, For, Show, createMemo, createEffect } from "solid-js";
import { apiRequest } from "../utils/api";
import { useNotifications } from "../stores/notifications";
import {
    EDIT_SVG, ADD_SVG, CLOSE_SVG, SEARCH_SVG, MAIL_SVG, CROWN_SVG
} from '../utils/icons';
import Avatar from "../components/Avatar";
import Modal from "../components/Modal";
import { showConfirmModal } from "../utils/modal";
import PageTitle from "../components/PageTitle";

interface ExecMember {
    id: number;
    user_id?: number;
    role_name: string;
    first_name: string;
    last_name: string;
    email: string;
    display_order: number;
    term_start?: string;
    term_end: string;
    is_current: boolean;
    first_name_override?: string;
    last_name_override?: string;
    email_override?: string;
    profile_picture_path?: string;
    profile_picture_override_id?: number;
}

interface ExecData {
    current: ExecMember[];
    past: ExecMember[];
}

export default function ExecPage() {
    const { notify } = useNotifications();
    const [permissions, setPermissions] = createSignal<string[]>([]);
    const [isModalOpen, setIsModalOpen] = createSignal(false);
    const [editingMember, setEditingMember] = createSignal<ExecMember | null>(null);

    const [execData, { refetch }] = createResource<ExecData>(() => apiRequest('GET', '/api/exec'));

    onMount(async () => {
        try {
            const userRes = await apiRequest('GET', '/api/user/elements/permissions', null, true);
            setPermissions(userRes.permissions || []);
        } catch (e) { }
    });

    const canManage = () => permissions().includes('exec.manage');

    const sortedCurrent = createMemo(() => {
        const data = execData();
        if (!data || !Array.isArray(data.current)) return [];
        return [...data.current].sort((a, b) => (a.display_order || 99) - (b.display_order || 99));
    });

    const groupedPast = createMemo(() => {
        const data = execData();
        if (!data || !Array.isArray(data.past)) return [];
        const groups = new Map<number, ExecMember[]>();
        data.past.forEach(m => {
            const year = m.term_end ? new Date(m.term_end).getFullYear() : 0;
            if (!groups.has(year)) groups.set(year, []);
            groups.get(year)!.push(m);
        });
        return Array.from(groups.entries())
            .sort(([a], [b]) => b - a)
            .map(([year, members]) => ({ year, members }));
    });

    const handleDeleteMember = async (id: number) => {
        if (await showConfirmModal("Remove Exec?", "Are you sure you want to remove this record?")) {
            try {
                await apiRequest('DELETE', `/api/exec/${id}`);
                notify('Success', 'Member removed.', 'success');
                refetch();
            } catch (err: any) {
                notify('Error', err.message, 'error');
            }
        }
    };

    return (
        <div id="exec-view" class="view small-container">
            <header class="files-header mb-6">
                <div class="files-title-row">
                    <PageTitle text="Executive Committee" />
                </div>
                <div class="files-controls">
                    <Show when={canManage()}>
                        <button class="primary" onClick={() => { setEditingMember(null); setIsModalOpen(true); }}>
                            <span innerHTML={ADD_SVG} /> Add Member
                        </button>
                    </Show>
                </div>
            </header>

            <Show when={execData.loading}>
                <p aria-busy="true" class="center-text">Loading committee...</p>
            </Show>

            <div class="exec-dense-grid">
                <For each={sortedCurrent()}>
                    {(member) => (
                        <ExecCard
                            member={member}
                            rank={member.display_order || 4}
                            canManage={canManage()}
                            onEdit={() => { setEditingMember(member); setIsModalOpen(true); }}
                            onDelete={() => handleDeleteMember(member.id)}
                        />
                    )}
                </For>
            </div>

            <Show when={groupedPast().length > 0}>
                <div class="mt-8 mb-4 center-text">
                    <h2>Past Committees</h2>
                </div>
                <div class="past-exec-dense-container">
                    <For each={groupedPast()}>
                        {(group) => (
                            <div class="liquid-container mb-4" style={{ "--liquid-padding": "1rem" }}>
                                <h3 class="small-title mb-3">Academic Year {group.year > 0 ? `${group.year - 1}/${group.year}` : 'Unknown'}</h3>
                                <div class="past-members-list-dense">
                                    <For each={group.members}>
                                        {(m) => (
                                            <div class="past-member-row-dense">
                                                <Avatar user={m} classes="mini" />
                                                <div class="info">
                                                    <span class="name">{m.first_name} {m.last_name}</span>
                                                    <span class="role muted-text">{m.role_name}</span>
                                                </div>
                                                <Show when={canManage()}>
                                                    <button class="outline secondary mini-btn" onClick={() => { setEditingMember(m); setIsModalOpen(true); }}>
                                                        <span innerHTML={EDIT_SVG} />
                                                    </button>
                                                </Show>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </div>
                        )}
                    </For>
                </div>
            </Show>

            <Show when={isModalOpen()}>
                <ExecEditModal
                    member={editingMember()}
                    onClose={() => setIsModalOpen(false)}
                    onSave={() => { setIsModalOpen(false); refetch(); }}
                />
            </Show>
        </div>
    );
}

function ExecCard(props: { member: ExecMember, rank: number, canManage: boolean, onEdit: () => void, onDelete: () => void }) {
    const isLeadership = () => props.rank <= 2;
    return (
        <article class={`liquid-container exec-card-dense rank-${props.rank} ${isLeadership() ? 'leadership' : ''}`}>
            <Show when={props.rank === 1}>
                <div class="sparkle" />
                <div class="sparkle" />
                <div class="sparkle" />
                <div class="sparkle" />
            </Show>
            <Show when={props.rank === 1}>
                <div class="leader-badge" innerHTML={CROWN_SVG} />
            </Show>
            <div class="exec-card-header">
                <div class="avatar-container">
                    <Avatar user={props.member} classes="medium" />
                    <Show when={isLeadership()}>
                        <div class="waves">
                            <div class="wave" />
                            <div class="wave" />
                        </div>
                    </Show>
                </div>
                <div class="exec-card-id">
                    <span class="role">{props.member.role_name}</span>
                    <h3 class="name">{props.member.first_name} {props.member.last_name}</h3>
                </div>
            </div>
            <div class="exec-card-footer">
                <a href={`mailto:${props.member.email}`} class="email-link muted-text">
                    <span innerHTML={MAIL_SVG} /> {props.member.email}
                </a>
                <Show when={props.canManage}>
                    <div class="actions">
                        <button class="outline secondary mini-btn" onClick={props.onEdit} title="Edit">
                            <span innerHTML={EDIT_SVG} />
                        </button>
                        <button class="outline error mini-btn" onClick={props.onDelete} title="Remove">
                            <span innerHTML={CLOSE_SVG} />
                        </button>
                    </div>
                </Show>
            </div>
        </article>
    );
}

function ExecEditModal(props: { member: ExecMember | null, onClose: () => void, onSave: () => void }) {
    const { notify } = useNotifications();
    const [userSearch, setUserSearch] = createSignal("");
    const [userResults, setUserResults] = createSignal<any[]>([]);
    const [selectedUser, setSelectedUser] = createSignal<any | null>(null);

    createEffect(async () => {
        const query = userSearch().trim();
        if (query.length < 2) return setUserResults([]);
        try {
            const res = await apiRequest('GET', `/api/admin/users?search=${encodeURIComponent(query)}&limit=5`);
            setUserResults(res.data?.users || []);
        } catch (e) { }
    });

    const handleSave = async (e: Event) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = {
            userId: selectedUser()?.id || props.member?.user_id || null,
            roleName: formData.get('roleName'),
            displayOrder: parseInt(formData.get('displayOrder') as string) || 0,
            isCurrent: formData.get('isCurrent') === 'on' ? 1 : 0,
            termStart: formData.get('termStart') || null,
            termEnd: formData.get('termEnd') || null,
            firstNameOverride: formData.get('firstNameOverride') || null,
            lastNameOverride: formData.get('lastNameOverride') || null,
            emailOverride: formData.get('emailOverride') || null,
            profilePictureOverrideId: formData.get('ppOverrideId') || null
        };

        try {
            if (props.member) {
                await apiRequest('PUT', `/api/exec/${props.member.id}`, data);
            } else {
                await apiRequest('POST', '/api/exec', data);
            }
            notify('Success', `Member ${props.member ? 'updated' : 'added'}.`, 'success');
            props.onSave();
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    return (
        <Modal
            isOpen={true}
            title={props.member ? 'Edit Exec Member' : 'Add Exec Member'}
            onClose={props.onClose}
        >
            <form onSubmit={handleSave} class="modern-form">
                <div class="form-section liquid-container mb-4" style={{ "--liquid-padding": "1rem" }}>
                    <h3 class="small-title">Member Link</h3>
                    <div class="search-field mb-3">
                        <div class="glass-input-group liquid-container" style={{ "--liquid-padding": "0 0.75rem" }}>
                            <span class="icon" innerHTML={SEARCH_SVG} />
                            <input
                                type="text"
                                placeholder="Search user..."
                                value={userSearch()}
                                onInput={(e) => setUserSearch(e.currentTarget.value)}
                            />
                        </div>
                        <Show when={userResults().length > 0}>
                            <div class="liquid-container mt-2 item-list-scroll-small" style={{ "--liquid-padding": "0px" }}>
                                <For each={userResults()}>
                                    {(u) => (
                                        <div class="search-result-item clickable" onClick={() => {
                                            setSelectedUser(u);
                                            setUserSearch(`${u.first_name} ${u.last_name}`);
                                            setUserResults([]);
                                        }} style="padding: 0.5rem; display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid rgba(128,128,128,0.1);">
                                            <Avatar user={u} classes="mini" />
                                            <div>
                                                <strong>{u.first_name} {u.last_name}</strong><br />
                                                <small class="muted-text">{u.email}</small>
                                            </div>
                                        </div>
                                    )}
                                </For>
                            </div>
                        </Show>
                    </div>
                    <div class="grid">
                        <label>Role
                            <input type="text" name="roleName" value={props.member?.role_name || ''} placeholder="e.g. Treasurer" required />
                        </label>
                        <label>Order
                            <input type="number" name="displayOrder" value={props.member?.display_order || 0} />
                        </label>
                    </div>
                </div>

                <div class="form-section liquid-container mb-4" style={{ "--liquid-padding": "1rem" }}>
                    <h3 class="small-title">Status & Term</h3>
                    <label class="mb-3">
                        <input type="checkbox" name="isCurrent" checked={props.member ? props.member?.is_current : true} />
                        Current Committee Member
                    </label>
                    <div class="grid">
                        <label>Start <input type="date" name="termStart" value={props.member?.term_start?.split('T')[0] || ''} /></label>
                        <label>End <input type="date" name="termEnd" value={props.member?.term_end?.split('T')[0] || ''} /></label>
                    </div>
                </div>

                <div class="form-section liquid-container mb-4" style={{ "--liquid-padding": "1rem" }}>
                    <h3 class="small-title">Overrides (Optional)</h3>
                    <div class="grid">
                        <label>First Name <input type="text" name="firstNameOverride" value={props.member?.first_name_override || ''} /></label>
                        <label>Last Name <input type="text" name="lastNameOverride" value={props.member?.last_name_override || ''} /></label>
                    </div>
                    <label>Email <input type="email" name="emailOverride" value={props.member?.email_override || ''} /></label>
                </div>

                <div class="form-actions">
                    <button type="submit" class="primary full-width">{props.member ? 'Update' : 'Add'}</button>
                </div>
            </form>
        </Modal>
    );
}

import { createSignal, createResource, onMount, For, Show, createMemo, createEffect } from "solid-js";
import { apiRequest } from "../utils/api";
import { useNotifications } from "../stores/notifications";
import { useAuth } from "../stores/auth";
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
    username?: string;
    display_order: number;
    term_start?: string;
    term_end: string;
    is_current: boolean;
    first_name_override?: string;
    last_name_override?: string;
    email_override?: string;
    profile_picture_path?: string;
    profile_picture_override_id?: number;
    instagram_link?: string;
    linkedin_link?: string;
    manifesto_path?: string;
}

interface ExecData {
    current: ExecMember[];
    past: ExecMember[];
}

export default function ExecPage() {
    const { notify } = useNotifications();
    const { user: currentUser } = useAuth();
    const [permissions, setPermissions] = createSignal<string[]>([]);
    const [isModalOpen, setIsModalOpen] = createSignal(false);
    const [editingMember, setEditingMember] = createSignal<ExecMember | null>(null);
    const [selectedMember, setSelectedMember] = createSignal<ExecMember | null>(null);

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
        
        // Group by committee (defined by the President)
        const groups: { president: ExecMember, members: ExecMember[], term: string }[] = [];
        
        // Find all presidents in past data
        const presidents = data.past.filter(m => m.role_name === 'President').sort((a, b) => {
            return new Date(b.term_end).getTime() - new Date(a.term_end).getTime();
        });

        presidents.forEach(pres => {
            const presEndDate = new Date(pres.term_end).getTime();
            const presStartDate = pres.term_start ? new Date(pres.term_start).getTime() : 0;
            
            // Members who served under this president (approximate by overlapping term_end)
            const members = data.past.filter(m => {
                if (m.id === pres.id) return false;
                const mEndDate = new Date(m.term_end).getTime();
                // If they ended on the same day as the president, they are likely in that committee
                return Math.abs(mEndDate - presEndDate) < (1000 * 60 * 60 * 24 * 7); // 1 week tolerance
            }).sort((a, b) => (a.display_order || 99) - (b.display_order || 99));

            groups.push({
                president: pres,
                members: members,
                term: `${pres.term_start?.split('-')[0] || ''}/${pres.term_end?.split('-')[0] || ''}`
            });
        });

        return groups;
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
            <header class="files-header">
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
                            isSelf={!!currentUser() && currentUser()?.id === member.user_id}
                            onEdit={() => { setEditingMember(member); setIsModalOpen(true); }}
                            onDelete={() => handleDeleteMember(member.id)}
                            onSelect={() => setSelectedMember(member)}
                        />
                    )}
                </For>
            </div>

            <Show when={groupedPast().length > 0}>
                <div class="past-committees-header">
                    <h2>Past Committees</h2>
                </div>
                <div class="past-exec-dense-container">
                    <For each={groupedPast()}>
                        {(group) => (
                            <div class="liquid-container past-exec-year-panel">
                                <h3 class="small-title">The {group.president.last_name} Committee ({group.term})</h3>
                                <div class="past-members-list-dense">
                                    <div class="past-member-row-dense clickable" onClick={() => setSelectedMember(group.president)}>
                                        <Avatar user={group.president} classes="mini" />
                                        <div class="info">
                                            <span class="name">{group.president.first_name} {group.president.last_name}</span>
                                            <span class="role muted-text">{group.president.role_name}</span>
                                        </div>
                                    </div>
                                    <For each={group.members}>
                                        {(m) => (
                                            <div class="past-member-row-dense clickable" onClick={() => setSelectedMember(m)}>
                                                <Avatar user={m} classes="mini" />
                                                <div class="info">
                                                    <span class="name">{m.first_name} {m.last_name}</span>
                                                    <span class="role muted-text">{m.role_name}</span>
                                                </div>
                                                <Show when={canManage()}>
                                                    <button class="outline secondary mini-btn" onClick={(e) => { e.stopPropagation(); setEditingMember(m); setIsModalOpen(true); }}>
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

            <Show when={selectedMember()}>
                <ExecDetailsModal 
                    member={selectedMember()!} 
                    onClose={() => setSelectedMember(null)} 
                />
            </Show>
        </div>
    );
}

function ExecCard(props: { member: ExecMember, rank: number, canManage: boolean, isSelf: boolean, onEdit: () => void, onDelete: () => void, onSelect: () => void }) {
    const isLeadership = () => props.rank <= 2;
    return (
        <article 
            class={`liquid-container exec-card-dense rank-${props.rank} ${isLeadership() ? 'leadership' : ''} clickable`}
            onClick={props.onSelect}
        >
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
                    <Show when={props.member.username}>
                        <span class="username muted-text">@{props.member.username.split('@')[0]}</span>
                    </Show>
                </div>
            </div>
            <div class="exec-card-footer">
                <div class="social-links" onClick={(e) => e.stopPropagation()}>
                    <Show when={props.member.instagram_link}>
                        <a href={props.member.instagram_link} target="_blank" rel="noopener noreferrer" class="social-link">
                            <img src="/images/icons/social_instagram.svg" alt="Instagram" />
                        </a>
                    </Show>
                    <Show when={props.member.linkedin_link}>
                        <a href={props.member.linkedin_link} target="_blank" rel="noopener noreferrer" class="social-link">
                            <img src="/images/icons/social_linkedin.svg" alt="LinkedIn" />
                        </a>
                    </Show>
                </div>
                <Show when={props.canManage || props.isSelf}>
                    <div class="actions" onClick={(e) => e.stopPropagation()}>
                        <Show when={props.canManage || props.isSelf}>
                            <button class="outline secondary mini-btn" onClick={props.onEdit} title="Edit">
                                <span innerHTML={EDIT_SVG} />
                            </button>
                        </Show>
                        <Show when={props.canManage}>
                            <button class="outline error mini-btn" onClick={props.onDelete} title="Remove">
                                <span innerHTML={CLOSE_SVG} />
                            </button>
                        </Show>
                    </div>
                </Show>
            </div>
        </article>
    );
}

function ExecDetailsModal(props: { member: ExecMember, onClose: () => void }) {
    return (
        <Modal 
            isOpen={true} 
            title={`${props.member.first_name}'s Profile`}
            onClose={props.onClose}
        >
            <div class="exec-details-view center-text">
                <Avatar user={props.member} classes="giant" />
                <h2 class="mt-3 mb-0">{props.member.first_name} {props.member.last_name}</h2>
                <p class="muted-text mb-4">{props.member.role_name}</p>

                <div class="liquid-container p-4 mb-4">
                    <div class="flex justify-center gap-6">
                        <Show when={props.member.instagram_link}>
                            <a href={props.member.instagram_link} target="_blank" rel="noopener noreferrer" class="social-link-large">
                                <img src="/images/icons/social_instagram.svg" alt="Instagram" style="width: 32px;" />
                                <span class="block small-text">Instagram</span>
                            </a>
                        </Show>
                        <Show when={props.member.linkedin_link}>
                            <a href={props.member.linkedin_link} target="_blank" rel="noopener noreferrer" class="social-link-large">
                                <img src="/images/icons/social_linkedin.svg" alt="LinkedIn" style="width: 32px;" />
                                <span class="block small-text">LinkedIn</span>
                            </a>
                        </Show>
                        <a href={`mailto:${props.member.email}`} class="social-link-large">
                            <span class="block" style="font-size: 32px;" innerHTML={MAIL_SVG} />
                            <span class="block small-text">Email</span>
                        </a>
                    </div>
                </div>

                <Show when={props.member.manifesto_path}>
                    <div class="manifesto-section liquid-container p-4">
                        <h3 class="small-title mb-2">Manifesto</h3>
                        <p class="small-text mb-3">Read the manifesto that got {props.member.first_name} elected to this role.</p>
                        <a href={props.member.manifesto_path} target="_blank" class="button primary full-width">View Manifesto (PDF)</a>
                    </div>
                </Show>
            </div>
        </Modal>
    );
}


function ExecEditModal(props: { member: ExecMember | null, onClose: () => void, onSave: () => void }) {
    const { notify } = useNotifications();
    const { user: currentUser } = useAuth();
    const [userSearch, setUserSearch] = createSignal("");
    const [userResults, setUserResults] = createSignal<any[]>([]);
    const [selectedUser, setSelectedUser] = createSignal<any | null>(null);

    // Determine if the current user is editing their own profile
    const isSelfEdit = createMemo(() => !!props.member && !!currentUser() && props.member.user_id === currentUser()?.id);

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
            user_id: selectedUser()?.id || props.member?.user_id || null, // Renamed to user_id to match DB
            role_name: formData.get('roleName'), // Renamed to role_name to match DB
            display_order: parseInt(formData.get('displayOrder') as string) || 0, // Renamed
            is_current: formData.get('isCurrent') === 'on' ? 1 : 0, // Renamed
            term_start: formData.get('termStart') || null, // Renamed
            term_end: formData.get('termEnd') || null, // Renamed
            first_name_override: formData.get('firstNameOverride') || null,
            last_name_override: formData.get('lastNameOverride') || null,
            email_override: formData.get('emailOverride') || null,
            profile_picture_override_id: formData.get('ppOverrideId') || null,
            manifesto_file_id: formData.get('manifestoFileId') || null,
            instagram_link: formData.get('instagramLink') || null,
            linkedin_link: formData.get('linkedinLink') || null
        };

        try {
            if (props.member) { // Editing existing member
                if (isSelfEdit()) {
                    // Self-edit: use /api/exec/me
                    await apiRequest('PUT', '/api/exec/me', data);
                } else {
                    // Admin editing other member: use /api/exec/:id
                    await apiRequest('PUT', `/api/exec/${props.member.id}`, data);
                }
            } else { // Adding new member
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
            title={props.member ? (isSelfEdit() ? 'Edit Your Profile' : 'Edit Exec Member') : 'Add Exec Member'}
            onClose={props.onClose}
        >
            <form onSubmit={handleSave} class="modern-form">
                <div class="form-section liquid-container">
                    <h3 class="small-title">Member Link</h3>
                    <div class="search-field">
                        <div class="glass-input-group liquid-container">
                            <span class="icon" innerHTML={SEARCH_SVG} />
                            <input
                                type="text"
                                placeholder="Search user..."
                                value={userSearch()}
                                onInput={(e) => setUserSearch(e.currentTarget.value)}
                                disabled={isSelfEdit() && !!props.member?.user_id} // Disable user search if self-editing an existing member
                            />
                        </div>
                        <Show when={userResults().length > 0}>
                            <div class="liquid-container item-list-scroll-small">
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
                            <input type="text" name="roleName" value={props.member?.role_name || ''} placeholder="e.g. Treasurer" required disabled={isSelfEdit() && !!props.member?.user_id} />
                        </label>
                        <label>Order
                            <input type="number" name="displayOrder" value={props.member?.display_order || 0} disabled={isSelfEdit() && !!props.member?.user_id} />
                        </label>
                    </div>
                </div>

                <div class="form-section liquid-container">
                    <h3 class="small-title">Status & Term</h3>
                    <label class="mb-3">
                        <input type="checkbox" name="isCurrent" checked={props.member ? props.member?.is_current : true} disabled={isSelfEdit() && !!props.member?.user_id} />
                        Current Committee Member
                    </label>
                    <div class="grid">
                        <label>Start <input type="date" name="termStart" value={props.member?.term_start?.split('T')[0] || ''} disabled={isSelfEdit() && !!props.member?.user_id} /></label>
                        <label>End <input type="date" name="termEnd" value={props.member?.term_end?.split('T')[0] || ''} disabled={isSelfEdit() && !!props.member?.user_id} /></label>
                    </div>
                </div>

                <div class="form-section liquid-container">
                    <h3 class="small-title">Overrides (Optional)</h3>
                    <div class="grid">
                        <label>First Name <input type="text" name="firstNameOverride" value={props.member?.first_name_override || ''} /></label>
                        <label>Last Name <input type="text" name="lastNameOverride" value={props.member?.last_name_override || ''} /></label>
                    </div>
                    <label>Email <input type="email" name="emailOverride" value={props.member?.email_override || ''} /></label>
                    <label>Manifesto File ID <input type="number" name="manifestoFileId" value={props.member?.manifesto_file_id || ''} placeholder="e.g. 123" /></label>
                    <label>Instagram Link <input type="text" name="instagramLink" value={props.member?.instagram_link || ''} placeholder="e.g. https://instagram.com/user" /></label>
                    <label>LinkedIn Link <input type="text" name="linkedinLink" value={props.member?.linkedin_link || ''} placeholder="e.g. https://linkedin.com/in/user" /></label>
                </div>

                <div class="form-actions">
                    <button type="submit" class="primary full-width">{props.member ? 'Update' : 'Add'}</button>
                </div>
            </form>
        </Modal>
    );
}

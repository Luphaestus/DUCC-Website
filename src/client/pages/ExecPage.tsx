import { createSignal, createResource, onMount, For, Show, createMemo } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import {
    GROUP_SVG, EDIT_SVG, ADD_SVG, CLOSE_SVG, SEARCH_SVG
} from '@/utils/icons';
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import { showConfirmModal } from "@/utils/modal";
import LiquidContainer from "@/components/LiquidContainer";

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
    
    const [execData, { refetch }] = createResource<ExecData>(async () => {
        return await apiRequest('GET', '/api/exec');
    });

    onMount(async () => {
        try {
            const userRes = await apiRequest('GET', '/api/user/elements/permissions');
            setPermissions(userRes.permissions || []);
        } catch (e) {}
    });

    const canManage = () => permissions().includes('exec.manage');

    const groupedCurrent = createMemo(() => {
        const current = execData()?.current || [];
        const grouped: Record<number, ExecMember[]> = {};
        current.forEach(m => {
            const rank = m.display_order || 4;
            if (!grouped[rank]) grouped[rank] = [];
            grouped[rank].push(m);
        });
        return Object.keys(grouped).map(Number).sort((a, b) => a - b).map(rank => ({ rank, members: grouped[rank] }));
    });

    const groupedPast = createMemo(() => {
        const past = execData()?.past || [];
        const grouped: Record<number, ExecMember[]> = {};
        past.forEach(m => {
            const year = new Date(m.term_end).getFullYear();
            if (!grouped[year]) grouped[year] = [];
            grouped[year].push(m);
        });
        return Object.keys(grouped).map(Number).sort((a, b) => b - a).map(year => ({ year, members: grouped[year] }));
    });

    const [isModalOpen, setIsModalOpen] = createSignal(false);
    const [editingMember, setEditingMember] = createSignal<ExecMember | null>(null);

    const handleOpenModal = (member: ExecMember | null = null) => {
        setEditingMember(member);
        setIsModalOpen(true);
    };

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

    const handleSaveMember = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = {
            userId: formData.get('userId') || null,
            roleName: formData.get('roleName'),
            displayOrder: parseInt(formData.get('displayOrder') as string),
            isCurrent: formData.get('isCurrent') === 'on' ? 1 : 0,
            termStart: formData.get('termStart') || null,
            termEnd: formData.get('termEnd') || null,
            firstNameOverride: formData.get('firstNameOverride') || null,
            lastNameOverride: formData.get('lastNameOverride') || null,
            emailOverride: formData.get('emailOverride') || null,
            profilePictureOverrideId: formData.get('ppOverrideId') || null
        };

        try {
            if (editingMember()) {
                await apiRequest('PUT', `/api/exec/${editingMember()!.id}`, data);
                notify('Success', 'Member updated.', 'success');
            } else {
                await apiRequest('POST', '/api/exec', data);
                notify('Success', 'Member added.', 'success');
            }
            setIsModalOpen(false);
            refetch();
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    // User search for linking
    const [userSearch, setUserSearch] = createSignal("");
    const [userResults, setUserResults] = createSignal<any[]>([]);
    const [selectedUser, setSelectedSelectedUser] = createSignal<any | null>(null);

    onMount(() => {
        createMemo(async () => {
            const query = userSearch();
            if (query.length < 2) {
                setUserResults([]);
                return;
            }
            try {
                const res = await apiRequest('GET', `/api/admin/users?search=${encodeURIComponent(query)}&limit=5`);
                setUserResults(res.data?.users || []);
            } catch (e) {}
        });
    });

    return (
        <div id="exec-view" class="view">
            <div class="container">
                <header class="page-header">
                    <div class="header-text">
                        <h1>Executive Committee</h1>
                        <p>The team running the club for the current academic year.</p>
                    </div>
                    <Show when={canManage()}>
                        <div class="header-actions">
                            <button class="primary" onClick={() => handleOpenModal()}>
                                <span innerHTML={ADD_SVG} /> Add Member
                            </button>
                        </div>
                    </Show>
                </header>

                <section id="current-exec-section">
                    <Show when={execData.loading}>
                        <p aria-busy="true">Loading committee...</p>
                    </Show>
                    <div id="current-exec-grid" class="exec-grid">
                        <For each={groupedCurrent()}>
                            {(group) => (
                                <div class={`exec-rank-row rank-${group.rank}-row`}>
                                    <div class="exec-grid">
                                        <For each={group.members}>
                                            {(member) => (
                                                <article class={`exec-card rank-${group.rank}`}>
                                                    <div class="exec-image">
                                                        <Show when={group.rank <= 2}>
                                                            <div class="waves"><div class="wave"></div><div class="wave"></div><div class="wave"></div></div>
                                                        </Show>
                                                        <Avatar user={member} classes={group.rank === 1 ? 'xlarge' : (group.rank >= 4 ? 'medium' : 'large')} />
                                                    </div>
                                                    <div class="exec-info">
                                                        <h3>{member.role_name}</h3>
                                                        <p class="exec-name">{member.first_name} {member.last_name}</p>
                                                        <p class="exec-email">{member.email}</p>
                                                    </div>
                                                    <Show when={canManage()}>
                                                        <div class="exec-actions">
                                                            <button class="small-btn icon-only secondary" onClick={() => handleOpenModal(member)}>
                                                                <span innerHTML={EDIT_SVG} />
                                                            </button>
                                                            <button class="small-btn icon-only delete" onClick={() => handleDeleteMember(member.id)}>
                                                                <span innerHTML={CLOSE_SVG} />
                                                            </button>
                                                        </div>
                                                    </Show>
                                                </article>
                                            )}
                                        </For>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </section>

                <Show when={groupedPast().length > 0}>
                    <section id="past-exec-section" class="past-exec-section">
                        <h2>Past Committees</h2>
                        <div id="past-exec-container" class="past-exec-container">
                            <For each={groupedPast()}>
                                {(group) => (
                                    <div class="past-year-group">
                                        <h3>Academic Year {group.year - 1}/{group.year}</h3>
                                        <div class="past-exec-list">
                                            <For each={group.members}>
                                                {(m) => (
                                                    <div class="past-member-row">
                                                        <div class="past-member-avatar">
                                                            <Avatar user={m} classes="small" />
                                                        </div>
                                                        <div class="past-member-info">
                                                            <span class="member-role">{m.role_name}</span>
                                                            <span class="member-name">{m.first_name} {m.last_name}</span>
                                                        </div>
                                                        <Show when={canManage()}>
                                                            <button class="past-edit-btn" onClick={() => handleOpenModal(m)}>
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
                    </section>
                </Show>
            </div>

            <Modal 
                isOpen={isModalOpen()} 
                title={editingMember() ? 'Edit Exec Member' : 'Add Exec Member'} 
                onClose={() => setIsModalOpen(false)}
            >
                <form onSubmit={handleSaveMember} class="modern-form">
                    <div class="form-section">
                        <h3>Member Link</h3>
                        <div class="search-field mb-4">
                            <label>Search Existing Member</label>
                            <div class="glass-input-group">
                                <span class="icon" innerHTML={SEARCH_SVG} />
                                <input 
                                    type="text" 
                                    placeholder="Type name or email to link..." 
                                    value={userSearch()}
                                    onInput={(e) => setUserSearch(e.currentTarget.value)}
                                />
                            </div>
                            <Show when={userResults().length > 0}>
                                <LiquidContainer class="mt-2 item-list-scroll-small" padding="0px">
                                    <For each={userResults()}>
                                        {(u) => (
                                            <div class="search-result-item" onClick={() => {
                                                setSelectedSelectedUser(u);
                                                setUserSearch(`${u.first_name} ${u.last_name}`);
                                                setUserResults([]);
                                            }} style="padding: 0.75rem; cursor: pointer; border-bottom: 1px solid rgba(128,128,128,0.1); display: flex; align-items: center; gap: 0.75rem;">
                                                <Avatar user={u} classes="mini" />
                                                <div>
                                                    <strong>{u.first_name} {u.last_name}</strong><br />
                                                    <small class="muted-text">{u.email}</small>
                                                </div>
                                            </div>
                                        )}
                                    </For>
                                </LiquidContainer>
                            </Show>
                        </div>
                        <input type="hidden" name="userId" value={selectedUser()?.id || editingMember()?.user_id || ''} />
                        <div class="grid">
                            <label>Role Title 
                                <input type="text" name="roleName" value={editingMember()?.role_name || ''} placeholder="e.g. Welfare Officer" required />
                            </label>
                            <label>Display Order 
                                <input type="number" name="displayOrder" value={editingMember()?.display_order || 0} />
                            </label>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>Status & Term</h3>
                        <label>
                            <input type="checkbox" name="isCurrent" checked={editingMember() ? editingMember()?.is_current : true} />
                            Current Committee Member
                        </label>
                        <div class="grid">
                            <label>Term Start <input type="date" name="termStart" value={editingMember()?.term_start?.split('T')[0] || ''} /></label>
                            <label>Term End <input type="date" name="termEnd" value={editingMember()?.term_end?.split('T')[0] || ''} /></label>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>Overrides (Historical Data)</h3>
                        <div class="grid">
                            <label>First Name <input type="text" name="firstNameOverride" value={editingMember()?.first_name_override || ''} /></label>
                            <label>Last Name <input type="text" name="lastNameOverride" value={editingMember()?.last_name_override || ''} /></label>
                        </div>
                        <label>Email <input type="email" name="emailOverride" value={editingMember()?.email_override || ''} /></label>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="primary full-width">{editingMember() ? 'Update Member' : 'Add to Committee'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
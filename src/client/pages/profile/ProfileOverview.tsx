import { createSignal, createResource, Show, For, onMount, createEffect } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import Panel from "@/components/Panel";
import {
    SOCIAL_LEADERBOARD_SVG, ID_CARD_SVG, POOL_SVG, GROUP_SVG, EDIT_SVG, SHIELD_SVG, UPLOAD_SVG
} from '@/utils/icons';
import { showConfirmModal } from "@/utils/modal";
import { Tag } from "@/widgets/Tag";
import { UploadWidget } from "@/widgets/upload/UploadWidget";
import { smartDateAdjust } from "@/utils/utils";
import { BalanceChangedEvent, MembershipChangedEvent, ProfilePictureChangedEvent } from "@/utils/events/events";
import { useProfile } from "./ProfileLayout";

export default function ProfileOverview() {
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const context = useProfile();
    const profile = () => context?.profile();
    const refetch = () => context?.refetch();

    const [tags] = createResource(async () => {
        try {
            return await apiRequest('GET', '/api/user/tags');
        } catch (e) {
            return [];
        }
    });

    const [globals] = createResource(async () => {
        try {
            const membershipRes = await apiRequest('GET', '/api/globals/MembershipCost');
            return {
                membershipCost: Number(membershipRes.res?.MembershipCost?.data || 50)
            };
        } catch {
            return { membershipCost: 50 };
        }
    });

    const handleJoinMembership = async () => {
        const cost = globals()?.membershipCost || 50;
        if (await showConfirmModal("Confirm Membership", `Becoming a member costs <strong>£${cost.toFixed(2)}</strong>. Are you sure?`)) {
            try {
                await apiRequest('POST', '/api/user/join');
                notify('Welcome!', 'You are now a club member.', 'success');
                refetch();
                BalanceChangedEvent.notify();
                MembershipChangedEvent.notify();
            } catch (err: any) {
                notify('Error', err.message || 'Failed to join.', 'error');
            }
        }
    };

    const [isEditingSafety, setIsEditingSafety] = createSignal(false);
    const handleSaveSafety = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        try {
            await apiRequest('POST', '/api/user/elements', {
                first_aid_expiry: formData.get('first_aid_expiry'),
                phone_number: formData.get('phone_number')
            });
            notify('Success', 'Safety info updated.', 'success');
            setIsEditingSafety(false);
            refetch();
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    const handleToggleInstructor = async () => {
        const isInstructor = profile()?.is_instructor;
        if (isInstructor) {
            if (await showConfirmModal('Resign?', 'Are you sure you want to resign as an instructor?')) {
                await apiRequest('POST', '/api/user/elements', { is_instructor: false });
                refetch();
            }
        } else {
            await apiRequest('POST', '/api/user/elements', { is_instructor: true });
            refetch();
        }
    };

    const updatePP = async (data: any) => {
        const p = profile()!;
        try {
            await apiRequest('POST', '/api/user/profile-picture', {
                fileId: null,
                color: p.profile_picture_color,
                font: p.profile_picture_font,
                initials: p.profile_picture_initials,
                ...data
            });
            ProfilePictureChangedEvent.notify();
            refetch();
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    const colors = ['#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c', '#1abc9c', '#34495e', '#d35400', '#c0392b'];
    const initialsOptions = [
        { label: 'Both', value: 'both' },
        { label: 'First', value: 'first' },
        { label: 'Last', value: 'last' }
    ];
    const fonts = [
        { label: 'Sans', value: 'sans' },
        { label: 'Display', value: 'outfit' },
        { label: 'Serif', value: 'serif' },
        { label: 'Gothic', value: 'gothic' },
        { label: 'Retro', value: 'accent' },
        { label: 'Mono', value: 'mono' }
    ];

    let uploadWidget: UploadWidget | null = null;
    createEffect(() => {
        const p = profile();
        if (p && !uploadWidget) {
            const container = document.getElementById('avatar-upload-container');
            if (container) {
                uploadWidget = new UploadWidget(container, {
                    mode: 'inline',
                    enableLibrary: false,
                    enableUrl: false,
                    showActions: false,
                    showPreview: false,
                    enableCrop: true,
                    onImageSelect: async ({ id }) => {
                        if (!id) return;
                        try {
                            await apiRequest('POST', '/api/user/profile-picture', { fileId: id });
                            notify('Success', 'Profile picture updated.', 'success');
                            ProfilePictureChangedEvent.notify();
                            refetch();
                        } catch (err: any) {
                            notify('Error', err.message, 'error');
                        }
                    }
                });
            }
        }
    });

    return (
        <Show when={profile()} fallback={<p aria-busy="true">Loading profile...</p>}>
            <div id="avatar-upload-container" style="display: none;"></div>
            <section class="dashboard-section active">
                <Show when={!profile()!.is_member}>
                    <article class="accent-panel liquid-container glass-panel no-margin" style={{ "border": "none" }}>
                        <div class="panel-content">
                            <h2>You aren't a member yet</h2>
                            <p>You have <strong>{profile()!.free_sessions}</strong> free trial events remaining before membership is required.</p>
                        </div>
                        <div class="panel-action">
                            <button onClick={handleJoinMembership}>Become a Member</button>
                        </div>
                    </article>
                </Show>

                <div class="profile-overview-grid">
                    <div class="overview-main">
                        <Panel
                            title="Swimming Statistics"
                            icon={POOL_SVG}
                            action={
                                <button class="small-btn secondary" onClick={() => navigate('/swims')}>
                                    <span innerHTML={SOCIAL_LEADERBOARD_SVG} /> Leaderboard
                                </button>
                            }
                        >
                            <div class="stats-grid">
                                <div class="stat-item">
                                    <span class="stat-value">{profile()!.swimmer_stats?.yearly.swims || 0}</span>
                                    <span class="stat-label">Yearly Swims</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value">{profile()!.swimmer_stats?.yearly.rank || '-'}</span>
                                    <span class="stat-label">Yearly Rank</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value">{profile()!.swims}</span>
                                    <span class="stat-label">Total Swims</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value">{profile()!.booties}</span>
                                    <span class="stat-label">Total Booties</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value">#{profile()!.swimmer_rank}</span>
                                    <span class="stat-label">All Time Rank</span>
                                </div>
                            </div>
                        </Panel>

                        <Panel title="Club Status & Roles" icon={GROUP_SVG} class="glass-panel no-margin">
                            <div class="info-rows">
                                <div class="info-row">
                                    <span>Membership</span>
                                    <span class={`badge ${profile()!.is_member ? 'primary' : 'neutral'}`}>
                                        {profile()!.is_member ? 'Active Member' : `${profile()!.free_sessions} Trials Left`}
                                    </span>
                                </div>
                                <div class="info-row">
                                    <span>Membership Form</span>
                                    <button
                                        class="small-btn mini-bt no-margin"
                                        classList={{
                                            'warning': !profile()!.filled_legal_info,
                                            'secondary': profile()!.filled_legal_info
                                        }}
                                        onClick={() => navigate('/legal')}
                                    >
                                        {profile()!.filled_legal_info ? 'Signed' : 'Sign Now'}
                                    </button>
                                </div>
                                <div class="info-row">
                                    <span>Instructor</span>
                                    <div>
                                        <button class="small-btn mini-bt no-margin" onClick={handleToggleInstructor}>
                                            {profile()!.is_instructor ? 'Resign' : 'Apply'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <Show when={tags()?.length > 0}>
                                <div class="tags-section" style="border-top: 1px solid rgba(var(--pico-color-rgb), 0.1); padding-top: 1rem;">
                                    <h4 class="small-title">My Groups</h4>
                                    <div class="tags-list">
                                        <For each={tags()}>
                                            {(tag) => <Tag name={tag.name} color={tag.color} />}
                                        </For>
                                    </div>
                                </div>
                            </Show>
                        </Panel>
                    </div>

                    <div class="overview-side">
                        <Panel title="Profile Appearance" class="glass-panel" icon={ID_CARD_SVG}>
                            <div class="profile-avatar-row compact-customization">
                                <div class="profile-picture-container" onClick={() => uploadWidget?.inputEl.click()}>
                                    <Avatar user={profile()!} classes="large" />
                                    <div class="avatar-overlay" innerHTML={UPLOAD_SVG}></div>
                                </div>
                                <div class="profile-avatar-controls">
                                    <div class="avatar-presets">
                                        <h4 class="small-title">Colour Presets</h4>
                                        <div class="presets-grid" style="grid-template-columns: repeat(5, 1fr); gap: 0.5rem;">
                                            <For each={colors}>
                                                {(color) => (
                                                    <div
                                                        class="preset-item color-preset profile-avatar-size"
                                                        classList={{ active: profile()!.profile_picture_color === color }}
                                                        onClick={() => updatePP({ color })}
                                                    >
                                                        <Avatar user={{ ...profile()!, profile_picture_color: color, profile_picture_path: null }} classes="mini-avatar" />
                                                    </div>
                                                )}
                                            </For>
                                        </div>
                                        <div class="grid avatar-customization-grid" style="gap: 1rem;">
                                            <div>
                                                <h4 class="small-title">Initials</h4>
                                                <div class="presets-grid" style="grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
                                                    <For each={initialsOptions}>
                                                        {(opt) => (
                                                            <div
                                                                class="preset-item initials-preset profile-avatar-size"
                                                                classList={{ active: profile()!.profile_picture_initials === opt.value }}
                                                                onClick={() => updatePP({ initials: opt.value })}
                                                            >
                                                                <Avatar user={{ ...profile()!, profile_picture_initials: opt.value, profile_picture_path: null }} classes="mini-avatar" />
                                                            </div>
                                                        )}
                                                                                                                        </For>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                                <div>
                                                                                                                    <h4 class="small-title">Font</h4>
                                                                                                                    <div class="presets-grid" style="grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
                                                                                                                        <For each={fonts}>
                                                                                                                            {(f) => (
                                                                                                                                <div
                                                                                                                                    class="preset-item font-preset profile-avatar-size"
                                                                                                                                    classList={{ active: profile()!.profile_picture_font === f.value }}
                                                                                                                                    onClick={() => updatePP({ font: f.value })}
                                                                                                                                >
                                                                                                                                    <Avatar user={{ ...profile()!, profile_picture_font: f.value, profile_picture_path: null }} classes="mini-avatar" />
                                                                                                                                </div>
                                                                                                                            )}
                                                                                                                        </For>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </div>                                </div>
                            </div>
                        </Panel>

                        <Panel title="Safety & Contact" icon={SHIELD_SVG} class="glass-panel no-margin">
                            <div class="info-rows">
                                <div class="info-row">
                                    <span>Emergency Contact</span>
                                    <span>{profile()!.phone_number || 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span>First Aid</span>
                                    <span>{profile()!.first_aid_expiry || 'N/A'}</span>
                                </div>
                            </div>
                            <div class="form-actions">
                                <button class="small-btn secondary full-width" onClick={() => setIsEditingSafety(true)}>
                                    <span innerHTML={EDIT_SVG} /> Edit Safety Info
                                </button>
                            </div>
                        </Panel>
                    </div>
                </div>
            </section>

            <Modal isOpen={isEditingSafety()} onClose={() => setIsEditingSafety(false)} title="Update Safety Info">
                <form onSubmit={handleSaveSafety} class="modern-form">
                    <label>First Aid Expiry
                        <input
                            name="first_aid_expiry"
                            type="date"
                            value={profile()!.first_aid_expiry || ''}
                            onChange={e => {
                                const { date, valid } = smartDateAdjust(e.currentTarget.value);
                                if (valid) e.currentTarget.value = date.toISOString().split('T')[0];
                            }}
                            onFocus={e => {
                                if (!e.currentTarget.value) {
                                    e.currentTarget.value = new Date().toISOString().split('T')[0];
                                }
                            }}
                        />
                    </label>
                    <label>Emergency Contact
                        <input name="phone_number" type="tel" value={profile()!.phone_number || ''} placeholder="07700 900000" />
                    </label>
                    <div class="form-actions">
                        <button type="button" class="secondary" onClick={() => setIsEditingSafety(false)}>Cancel</button>
                        <button type="submit" class="primary">Save Changes</button>
                    </div>
                </form>
            </Modal>
        </Show>
    );
}

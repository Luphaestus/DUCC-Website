import { For } from "solid-js";
import Avatar from "@/components/Avatar";
import Panel from "@/components/Panel";
import { FaSolidIdCard, FaSolidCloudArrowUp } from 'solid-icons/fa';
import type { UserProfile } from "../types";

interface ProfileAppearancePanelProps {
    profile: UserProfile;
    colors: string[];
    initialsOptions: Array<{ label: string; value: string }>;
    fonts: Array<{ label: string; value: string }>;
    onUploadClick: () => void;
    onUpdate: (data: any) => void;
}

export default function ProfileAppearancePanel(props: ProfileAppearancePanelProps) {
    return (
        <Panel title="Profile Appearance" class="glass-panel" icon={<FaSolidIdCard />}>
            <div class="profile-avatar-row compact-customization">
                <div class="profile-picture-container" onClick={props.onUploadClick}>
                    <Avatar user={props.profile} classes="large" />
                    <div class="avatar-overlay"><FaSolidCloudArrowUp /></div>
                </div>
                <div class="profile-avatar-controls">
                    <div class="avatar-presets">
                        <h4 class="small-title">Colour Presets</h4>
                        <div class="presets-grid" style="grid-template-columns: repeat(5, 1fr); gap: 0.5rem;">
                            <For each={props.colors}>
                                {(color) => (
                                    <div
                                        class="preset-item color-preset profile-avatar-size"
                                        classList={{ active: props.profile.profile_picture_color === color }}
                                        onClick={() => props.onUpdate({ color })}
                                    >
                                        <Avatar user={{ ...props.profile, profile_picture_color: color, profile_picture_path: null }} classes="mini-avatar" />
                                    </div>
                                )}
                            </For>
                        </div>
                        <div class="grid avatar-customization-grid" style="gap: 1rem;">
                            <div>
                                <h4 class="small-title">Initials</h4>
                                <div class="presets-grid" style="grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
                                    <For each={props.initialsOptions}>
                                        {(opt) => (
                                            <div
                                                class="preset-item initials-preset profile-avatar-size"
                                                classList={{ active: props.profile.profile_picture_initials === opt.value }}
                                                onClick={() => props.onUpdate({ initials: opt.value })}
                                            >
                                                <Avatar user={{ ...props.profile, profile_picture_initials: opt.value, profile_picture_path: null }} classes="mini-avatar" />
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </div>
                            <div>
                                <h4 class="small-title">Font</h4>
                                <div class="presets-grid" style="grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
                                    <For each={props.fonts}>
                                        {(font) => (
                                            <div
                                                class="preset-item font-preset profile-avatar-size"
                                                classList={{ active: props.profile.profile_picture_font === font.value }}
                                                onClick={() => props.onUpdate({ font: font.value })}
                                            >
                                                <Avatar user={{ ...props.profile, profile_picture_font: font.value, profile_picture_path: null }} classes="mini-avatar" />
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Panel>
    );
}

import { For, Show } from "solid-js";
import Panel from "@/components/Panel";
import { Tag } from "@/widgets/Tag";
import { FaSolidArrowsRotate } from 'solid-icons/fa';
import type { UserProfile } from "../types";

interface ClubStatusAndRolesPanelProps {
    profile: UserProfile;
    tags: any[];
    onOpenLegalForm: () => void;
    onToggleInstructor: () => void;
}

export default function ClubStatusAndRolesPanel(props: ClubStatusAndRolesPanelProps) {
    return (
        <Panel title="Club Status & Roles" icon={<FaSolidArrowsRotate />} class="glass-panel no-margin">
            <div class="info-rows">
                <div class="info-row">
                    <span>Membership</span>
                    <span class={`badge ${props.profile.is_member ? 'primary' : 'neutral'}`}>
                        {props.profile.is_member ? 'Active Member' : `${props.profile.free_sessions} Trials Left`}
                    </span>
                </div>
                <div class="info-row">
                    <span>Membership Form</span>
                    <button
                        class="small-btn mini-bt no-margin"
                        classList={{
                            warning: !props.profile.filled_legal_info,
                            secondary: props.profile.filled_legal_info
                        }}
                        onClick={props.onOpenLegalForm}
                    >
                        {props.profile.filled_legal_info ? 'Signed' : 'Sign Now'}
                    </button>
                </div>
                <div class="info-row">
                    <span>Instructor</span>
                    <div>
                        <button class="small-btn mini-bt no-margin" onClick={props.onToggleInstructor}>
                            {props.profile.is_instructor ? 'Resign' : 'Apply'}
                        </button>
                    </div>
                </div>
            </div>

            <Show when={props.tags.length > 0}>
                <div class="tags-section" style="border-top: 1px solid rgba(var(--pico-color-rgb), 0.1); padding-top: 1rem;">
                    <h4 class="small-title">My Groups</h4>
                    <div class="tags-list">
                        <For each={props.tags}>
                            {(tag) => <Tag name={tag.name} color={tag.color} />}
                        </For>
                    </div>
                </div>
            </Show>
        </Panel>
    );
}

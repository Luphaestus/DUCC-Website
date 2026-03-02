import { For, Show } from "solid-js";
import Panel from "@/components/Panel";
import { FaSolidXmark, FaSolidPlus } from 'solid-icons/fa';

interface EmailRecord {
    id: number;
    email: string;
    is_primary: boolean;
    is_verified: boolean;
}

interface EmailAddressesPanelProps {
    emails: EmailRecord[];
    onOpenAddEmail: () => void;
    onResendVerification: (id: number) => void;
    onSetPrimary: (id: number) => void;
    onDelete: (id: number) => void;
}

export default function EmailAddressesPanel(props: EmailAddressesPanelProps) {
    return (
        <Panel title="Email Addresses" class="glass-panel mb-4">
            <p>Manage the email addresses associated with your account. You can log in with any verified email.</p>
            <div class="item-list" style={{ "margin-bottom": "1.5rem" }}>
                <For each={props.emails} fallback={<p aria-busy="true">Loading emails...</p>}>
                    {(email) => (
                        (() => {
                            const isDurhamEmail = String(email.email || "").trim().toLowerCase().endsWith("@durham.ac.uk");

                            return (
                                <div class="list-item">
                                    <div class="item-details">
                                        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                            <span class="item-title" style="margin: 0;">{email.email}</span>
                                            <Show when={email.is_primary}>
                                                <span class="status-tag success">Primary</span>
                                            </Show>
                                            <Show when={!email.is_verified}>
                                                <span class="status-tag warning">Unverified</span>
                                            </Show>
                                        </div>
                                    </div>
                                    <div class="item-value-group email-actions">
                                        <Show when={!email.is_verified}>
                                            <button class="small-btn secondary mini-btn resend-btn" onClick={() => props.onResendVerification(email.id)}>Resend</button>
                                        </Show>
                                        <Show when={!email.is_primary && email.is_verified}>
                                            <button class="small-btn secondary mini-btn resend-btn" onClick={() => props.onSetPrimary(email.id)}>Make Primary</button>
                                        </Show>
                                        <Show when={!email.is_primary && !isDurhamEmail}>
                                            <button class="small-btn icon-only delete email-delete-btn" onClick={() => props.onDelete(email.id)}><FaSolidXmark /></button>
                                        </Show>
                                    </div>
                                </div>
                            );
                        })()
                    )}
                </For>
            </div>
            <button class="secondary" onClick={props.onOpenAddEmail}>
                <FaSolidPlus /> Add Email
            </button>
        </Panel>
    );
}

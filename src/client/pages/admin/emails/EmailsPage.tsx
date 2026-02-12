import { createSignal, createResource, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import PageTitle from "@/components/PageTitle";
import RichTextEditor from "@/components/RichTextEditor";
import { MAIL_SVG, GROUP_SVG, PERSON_SVG, ALL_INCLUSIVE_SVG } from "@/utils/icons";
import { showConfirmModal } from "@/utils/modal";

export default function EmailsPage() {
    const { notify } = useNotifications();
    const [subject, setSubject] = createSignal("");
    const [content, setContent] = createSignal("");
    const [target, setTarget] = createSignal<'all' | 'members' | 'guests'>('members');
    const [isSending, setIsSending] = createSignal(false);

    const [stats] = createResource(async () => {
        return await apiRequest('GET', '/api/admin/emails/stats');
    });

    const handleSend = async (e: Event) => {
        e.preventDefault();
        
        if (!subject() || !content() || content() === '<p></p>') {
            notify('Error', 'Subject and content are required.', 'error');
            return;
        }

        const recipientCount = target() === 'all' ? stats()?.total : (target() === 'members' ? stats()?.members : stats()?.guests);
        
        if (await showConfirmModal(
            "Send Announcement?", 
            `You are about to send this email to ${recipientCount} recipients (${target()}). This action cannot be undone.`
        )) {
            setIsSending(true);
            try {
                await apiRequest('POST', '/api/admin/emails/send', {
                    subject: subject(),
                    content: content(),
                    target: target()
                });
                notify('Success', 'Email sending started.', 'success');
                setSubject("");
                setContent("");
            } catch (err: any) {
                notify('Error', err.message, 'error');
            } finally {
                setIsSending(false);
            }
        }
    };

    return (
        <div class="glass-layout">
            <PageTitle text="Email Announcements" centered={true} />
            
            <div class="grid-2-col mt-6" style={{ "grid-template-columns": "1fr 350px", "gap": "2rem" }}>
                <div class="email-editor-section">
                    <form onSubmit={handleSend} class="modern-form">
                        <label>Subject
                            <input 
                                type="text" 
                                value={subject()} 
                                onInput={(e) => setSubject(e.currentTarget.value)} 
                                placeholder="e.g. Important Club Update"
                                required 
                            />
                        </label>

                        <label class="mt-4">Message Content</label>
                        <RichTextEditor 
                            content={content()} 
                            onInput={setContent} 
                        />

                        <button 
                            type="submit" 
                            class="primary full-width mt-6" 
                            disabled={isSending() || stats.loading}
                        >
                            <span innerHTML={MAIL_SVG} /> {isSending() ? 'Sending...' : 'Send Announcement'}
                        </button>
                    </form>
                </div>

                <aside class="email-sidebar">
                    <div class="glass-panel p-4" style={{ "border-radius": "24px" }}>
                        <h3>Target Audience</h3>
                        <p class="helper-text mb-4">Select who will receive this email.</p>
                        
                        <div class="target-options flex-column-gap-half">
                            <button 
                                class={`target-card ${target() === 'members' ? 'active' : ''}`}
                                onClick={() => setTarget('members')}
                            >
                                <div class="icon" innerHTML={GROUP_SVG} />
                                <div class="info">
                                    <span class="label">Members Only</span>
                                    <span class="count">{stats()?.members || 0} recipients</span>
                                </div>
                            </button>

                            <button 
                                class={`target-card ${target() === 'guests' ? 'active' : ''}`}
                                onClick={() => setTarget('guests')}
                            >
                                <div class="icon" innerHTML={PERSON_SVG} />
                                <div class="info">
                                    <span class="label">Guests Only</span>
                                    <span class="count">{stats()?.guests || 0} recipients</span>
                                </div>
                            </button>

                            <button 
                                class={`target-card ${target() === 'all' ? 'active' : ''}`}
                                onClick={() => setTarget('all')}
                            >
                                <div class="icon" innerHTML={ALL_INCLUSIVE_SVG} />
                                <div class="info">
                                    <span class="label">Everyone</span>
                                    <span class="count">{stats()?.total || 0} recipients</span>
                                </div>
                            </button>
                        </div>

                        <div class="stats-footer mt-6 p-4 bg-[rgba(var(--pico-color-rgb),0.03)]" style={{ "border-radius": "16px" }}>
                            <p class="m-0 text-sm opacity-70">
                                emails are sent only to <strong>verified</strong> users.
                            </p>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

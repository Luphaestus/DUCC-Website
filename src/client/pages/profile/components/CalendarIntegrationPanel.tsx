import Panel from "@/components/Panel";
import { FaSolidCopy } from 'solid-icons/fa';

interface CalendarIntegrationPanelProps {
    isGeneratingToken: boolean;
    onSubscribePublic: () => void;
    onCopyPublic: () => void;
    onSubscribePersonal: () => void;
    onCopyPersonal: () => void;
    onSubscribeAccessible: () => void;
    onCopyAccessible: () => void;
}

export default function CalendarIntegrationPanel(props: CalendarIntegrationPanelProps) {
    return (
        <Panel title="Calendar Integration" class="glass-panel mb-4">
            <p>Import club events directly into your favorite calendar app (Google, Apple, Outlook, etc.).</p>
            <div class="settings-grid">
                <div class="two-fa-grid dual-grid">
                    <div class="liquid-container embedded-panel glass-panel">
                        <div class="setting-info">
                            <strong>All Events Feed</strong>
                            <p>Public events everyone can see.</p>
                        </div>
                        <div class="btn-group calendar-btn-group">
                            <button class="small-btn primary" onClick={props.onSubscribePublic}>Subscribe</button>
                            <button class="small-btn icon-only secondary" onClick={props.onCopyPublic}>
                                <FaSolidCopy />
                            </button>
                        </div>
                    </div>

                    <div class="liquid-container embedded-panel glass-panel">
                        <div class="setting-info">
                            <strong>My Events Feed</strong>
                            <p>Personalized feed of events you've joined.</p>
                        </div>
                        <div class="btn-group calendar-btn-group">
                            <button class="small-btn primary" onClick={props.onSubscribePersonal} disabled={props.isGeneratingToken}>
                                {props.isGeneratingToken ? '...' : 'Subscribe'}
                            </button>
                            <button class="small-btn icon-only secondary" onClick={props.onCopyPersonal} disabled={props.isGeneratingToken}>
                                <FaSolidCopy />
                            </button>
                        </div>
                    </div>

                    <div class="liquid-container embedded-panel glass-panel">
                        <div class="setting-info">
                            <strong>Accessible Events Feed</strong>
                            <p>Private feed of all events you can see.</p>
                        </div>
                        <div class="btn-group calendar-btn-group">
                            <button class="small-btn primary" onClick={props.onSubscribeAccessible} disabled={props.isGeneratingToken}>
                                {props.isGeneratingToken ? '...' : 'Subscribe'}
                            </button>
                            <button class="small-btn icon-only secondary" onClick={props.onCopyAccessible} disabled={props.isGeneratingToken}>
                                <FaSolidCopy />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Panel>
    );
}

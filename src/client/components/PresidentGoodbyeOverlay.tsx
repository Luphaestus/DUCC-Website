import { Show } from "solid-js";
import Avatar from "@/components/Avatar";
import { showGoodbye, outgoingExec, goodbyeRole, setShowGoodbye } from "@/stores/presidentGoodbye";
import { apiRequest } from "@/utils/api";

export default function PresidentGoodbyeOverlay() {
    const handleReturn = async () => {
        try {
            await apiRequest('POST', '/api/user/clear-goodbye');
        } catch (e) {}
        setShowGoodbye(false);
        window.location.href = '/home';
    };

    return (
        <Show when={showGoodbye()}>
            <div class="rip-bozo-overlay">
                <div class="rip-bozo-page">
                    <div class="meme-container">
                        <div class="meme-wrapper">
                            <img src="/images/misc/queen_rip_bozo.png" alt="RIP Bozo Template" class="base-image" />
                            
                            <Show when={outgoingExec()}>
                                <div class="avatar-positioner">
                                    <Avatar user={outgoingExec()} classes="giant-avatar" />
                                </div>
                            </Show>

                            <div class="text-overlay">
                                #RIP BOZO
                            </div>
                        </div>
                    </div>
                    
                    <div class="goodbye-content">
                        <h1>End of an Era</h1>
                        <p>Your term as <strong>{goodbyeRole()}</strong> has come to an end.</p>
                        <p>It's been a good run.</p>
                        <button class="button" onClick={handleReturn}>Return to Normalcy</button>
                    </div>
                </div>
            </div>
        </Show>
    );
}
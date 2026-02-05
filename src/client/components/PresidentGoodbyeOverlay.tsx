import { Show } from "solid-js";
import Avatar from "@/components/Avatar";
import { showGoodbye, outgoingPresident } from "@/stores/presidentGoodbye";
import "@/pages/PresidentGoodbyePage.scss";

export default function PresidentGoodbyeOverlay() {
    return (
        <Show when={showGoodbye()}>
            <div class="rip-bozo-overlay">
                <div class="rip-bozo-page">
                    <div class="meme-container">
                        <div class="meme-wrapper">
                            <img src="/images/misc/queen_rip_bozo.png" alt="RIP Bozo Template" class="base-image" />
                            
                            <Show when={outgoingPresident()}>
                                <div class="avatar-positioner">
                                    <Avatar user={outgoingPresident()} classes="giant-avatar" />
                                </div>
                            </Show>

                            <div class="text-overlay">
                                #RIP BOZO
                            </div>
                        </div>
                    </div>
                    
                    <div class="goodbye-content">
                        <h1>End of an Era</h1>
                        <p>You have successfully transferred the Presidency.</p>
                        <p>It's been a good run.</p>
                        <button class="button" onClick={() => window.location.href = '/home'}>Return to Normalcy</button>
                    </div>
                </div>
            </div>
        </Show>
    );
}
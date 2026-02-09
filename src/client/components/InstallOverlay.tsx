import { createSignal, onMount, Show, createResource } from "solid-js";
import { deferredPrompt, installPWA, installPWA as installPWAAction, isPWAInstalled } from "../utils/pwa";
import { CLOSE_SVG, DOWNLOAD_SVG } from "../utils/icons";
import { apiRequest } from "@/utils/api";

export default function InstallOverlay() {
    const [isVisible, setIsVisible] = createSignal(false);

    const [logo] = createResource(async () => {
        try {
            const res = await apiRequest('GET', '/api/globals/ClubLogo');
            return res.res?.ClubLogo?.data || "/api/files/1/download?view=true";
        } catch {
            return "/api/files/1/download?view=true";
        }
    });

    onMount(() => {
        // Don't show if already installed
        if (isPWAInstalled()) return;

        const doNotShow = localStorage.getItem('pwa_do_not_show');
        if (doNotShow === 'true') return;

        const lastShown = localStorage.getItem('pwa_last_shown');
        const now = Date.now();
        
        // Show if never shown, or if it's been 3 days since last shown
        if (!lastShown || (now - parseInt(lastShown) > 3 * 24 * 60 * 60 * 1000)) {
            // Wait a bit after load so it's not jarring
            setTimeout(() => {
                // Only show if we actually captured the prompt (desktop/android)
                // For iOS, the instructions would be different, but we'll focus on installable platforms first
                if (deferredPrompt()) {
                    setIsVisible(true);
                    localStorage.setItem('pwa_last_shown', now.toString());
                }
            }, 2000);
        }
    });

    const handleDismiss = (forever = false) => {
        setIsVisible(false);
        if (forever) {
            localStorage.setItem('pwa_do_not_show', 'true');
        }
    };

    return (
        <Show when={isVisible()}>
            <div class="pwa-overlay-backdrop">
                <div class="pwa-overlay-container">
                    <div 
                        class="liquid-container pwa-card" 
                        style={{ 
                            "--liquid-padding": "2rem", 
                            "--liquid-border-radius": "24px" 
                        }}
                    >
                        <button class="close-btn" onClick={() => handleDismiss(false)} innerHTML={CLOSE_SVG} />
                        
                        <div class="pwa-content">
                            <img src={logo() || "/api/files/1/download?view=true"} alt="DUCC Logo" class="pwa-logo" />
                            <h2>Install the App</h2>
                            <p>Get instant notifications for cancelled events, waitlist updates, and easier access to your profile.</p>
                            
                            <ul class="pwa-benefits">
                                <li>✨ Instant Updates</li>
                                <li>📅 Calendar Integration</li>
                                <li>🚀 Faster Loading</li>
                            </ul>

                            <button class="install-btn primary" onClick={() => { installPWA(); setIsVisible(false); }}>
                                <span innerHTML={DOWNLOAD_SVG} /> Install Now
                            </button>

                            <button class="text-btn muted" onClick={() => handleDismiss(true)}>
                                Don't show again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Show>
    );
}

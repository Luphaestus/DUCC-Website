import { createSignal } from "solid-js";
import { apiRequest } from "./api";

// VAPID Public Key (You will need to generate this on the backend and provide it via API or env)
// For now, we fetch it from the server or use a placeholder that will be replaced.
let VAPID_PUBLIC_KEY = ''; 

export const [deferredPrompt, setDeferredPrompt] = createSignal<any>(null);
export const [isPWAInstalled, setIsPWAInstalled] = createSignal(false);
export const [isSubscribed, setIsSubscribed] = createSignal(false);

export const isManualInstall = () => {
    const isIOS = [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
    ].includes(navigator.platform)
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document);

    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    return isIOS || isSafari;
};

export const initPWA = async () => {
    console.log('[PWA] Initializing...');
    
    // Check if running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    console.log('[PWA] Standalone mode:', isStandalone);
    setIsPWAInstalled(isStandalone);

    // Register Service Worker (skip on local dev to avoid caching issues)
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if ('serviceWorker' in navigator && !isLocal) {
        try {
            console.log('[PWA] Registering Service Worker...');
            const reg = await navigator.serviceWorker.register('/service-worker.js');
            console.log('[PWA] Service Worker Registered:', reg.scope);
            
            reg.onupdatefound = () => {
                console.log('[PWA] New content found, updating...');
            };

            checkSubscription(reg);
        } catch (e) {
            console.error('[PWA] Service Worker Registration failed:', e);
        }
    } else {
        console.warn('[PWA] Service Workers not supported');
    }

    window.addEventListener('appinstalled', () => {
        setIsPWAInstalled(true);
        setDeferredPrompt(null);
        console.log('[PWA] App installed');
        
        // Attempt auto-subscribe on install
        setTimeout(() => {
            console.log('[PWA] Attempting auto-subscription after install...');
            subscribeToNotifications().catch(err => console.error('[PWA] Auto-sub failed:', err));
        }, 1000);
    });

    // If already in standalone mode, try to ensure they are subscribed (once per session)
    if (isStandalone && !isSubscribed()) {
        const lastAutoSub = localStorage.getItem('pwa_last_auto_sub');
        const now = Date.now();
        // Only try automatically once every 24 hours if not subscribed
        if (!lastAutoSub || (now - parseInt(lastAutoSub) > 24 * 60 * 60 * 1000)) {
            setTimeout(() => {
                console.log('[PWA] Standalone mode detected, attempting background subscription check...');
                subscribeToNotifications().then(success => {
                    if (success) localStorage.setItem('pwa_last_auto_sub', now.toString());
                }).catch(() => {});
            }, 3000);
        }
    }
};

// Capture install prompt as early as possible (top level)
if (typeof window !== 'undefined') {
    console.log('[PWA] Adding beforeinstallprompt listener');
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log("[PWA] beforeinstallprompt event fired! Capturing...");
        e.preventDefault();
        setDeferredPrompt(e);
    });
}

const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

export const subscribeToNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
        // Explicitly check and request permission
        let permission = Notification.permission;
        console.log('[PWA] Current notification permission:', permission);
        
        if (permission === 'default') {
            permission = await Notification.requestPermission();
            console.log('[PWA] Notification permission requested. Result:', permission);
        }

        if (permission !== 'granted') {
            console.warn('[PWA] Notification permission denied or dismissed.');
            return false;
        }

        const reg = await navigator.serviceWorker.ready;
        
        // Fetch VAPID key from server if not set
        if (!VAPID_PUBLIC_KEY) {
            const res = await apiRequest('GET', '/api/notifications/vapid-key');
            VAPID_PUBLIC_KEY = res.key;
        }

        const subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        // Send to server
        await apiRequest('POST', '/api/notifications/subscribe', subscription);
        setIsSubscribed(true);
        localStorage.setItem('pwa_last_successful_sub', Date.now().toString());
        return true;
    } catch (e) {
        console.error('Failed to subscribe:', e);
        return false;
    }
};

export const unsubscribeFromNotifications = async () => {
    if (!('serviceWorker' in navigator)) return false;

    try {
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.getSubscription();
        
        if (subscription) {
            // Notify server
            await apiRequest('POST', '/api/notifications/unsubscribe', { endpoint: subscription.endpoint });
            // Unsubscribe locally
            await subscription.unsubscribe();
        }
        
        setIsSubscribed(false);
        return true;
    } catch (e) {
        console.error('Failed to unsubscribe:', e);
        return false;
    }
};

const checkSubscriptionRefresh = async () => {
    // If we have permission but no sub, or it's been more than 7 days, refresh
    if (Notification.permission === 'granted') {
        const lastSub = localStorage.getItem('pwa_last_successful_sub');
        const now = Date.now();
        if (!lastSub || (now - parseInt(lastSub) > 7 * 24 * 60 * 60 * 1000)) {
            console.log('[PWA] Refreshing background subscription...');
            subscribeToNotifications().catch(() => {});
        }
    }
};

const checkSubscription = async (reg: ServiceWorkerRegistration) => {
    const sub = await reg.pushManager.getSubscription();
    setIsSubscribed(!!sub);
    checkSubscriptionRefresh();
};

export const installPWA = async () => {
    const promptEvent = deferredPrompt();
    if (!promptEvent) return;

    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
};

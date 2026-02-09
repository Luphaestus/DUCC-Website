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
    // Check if running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsPWAInstalled(isStandalone);

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        try {
            const reg = await navigator.serviceWorker.register('/service-worker.js');
            console.log('SW Registered:', reg);
            checkSubscription(reg);
        } catch (e) {
            console.error('SW Registration failed:', e);
        }
    }

    window.addEventListener('appinstalled', () => {
        setIsPWAInstalled(true);
        setDeferredPrompt(null);
        console.log('PWA installed');
    });
};

// Capture install prompt as early as possible (top level)
if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        console.log("Install prompt captured");
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
        return true;
    } catch (e) {
        console.error('Failed to subscribe:', e);
        return false;
    }
};

const checkSubscription = async (reg: ServiceWorkerRegistration) => {
    const sub = await reg.pushManager.getSubscription();
    setIsSubscribed(!!sub);
};

export const installPWA = async () => {
    const promptEvent = deferredPrompt();
    if (!promptEvent) return;

    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
};

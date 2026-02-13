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

    // Register Service Worker
    if ('serviceWorker' in navigator) {
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
    });
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

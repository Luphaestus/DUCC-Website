import { ParentProps, onMount, onCleanup, createSignal, Show, ErrorBoundary } from "solid-js";
import { useNavigate } from "@solidjs/router";
import Navbar from "./components/Navbar";
import Background from "./components/Background";
import NotificationContainer from "./components/NotificationContainer";
import Footer from "./components/Footer";
import { initUpdates, onUpdate } from "./utils/updates";
import { ErrorView, NoInternetPage } from "./pages/ErrorPage";
import { BRIGHTNESS_ALERT_SVG } from "./utils/icons";
import PresidentGoodbyeOverlay from "./components/PresidentGoodbyeOverlay";
import InstallOverlay from "./components/InstallOverlay";
import { NoInternetEvent } from "./utils/events/events";
import { isServerConnected } from "./connection";
import { initPWA } from "./utils/pwa";

import { apiRequest } from "./utils/api";

import { useNotifications } from "./stores/notifications";

import { triggerExecGoodbye } from "./stores/presidentGoodbye";
import { useAuth } from "./stores/auth";

export default function App(props: ParentProps) {
  const navigate = useNavigate();
  window.solidNavigate = navigate;
  const { notify } = useNotifications();
  const { user } = useAuth();
  const [isOffline, setIsOffline] = createSignal(!isServerConnected);

  // Handle dynamic import errors (common after redeploy)
  window.addEventListener('error', (e) => {
    if (e.message?.includes('error loading dynamically imported module')) {
        console.warn('Hashed module not found, refreshing page...');
        window.location.reload();
    }
  }, true);

  onMount(() => {
    initPWA();
    initUpdates();

    // Check for goodbye role
    if (user() && user()?.goodbye_role) {
        triggerExecGoodbye(user(), user()!.goodbye_role);
    }
    const cleanup = NoInternetEvent.subscribe(() => {
        setIsOffline(!isServerConnected);
    });

    const updateCleanup = onUpdate((event) => {
        if (event.type === 'upcoming_event') {
            notify(
                'Event Starting Soon',
                `Reminder: "${event.data.title}" starts at ${event.data.startTime}!`,
                'info',
                10000
            );
        }
    });

    // Listen for PUSH notifications when the app is open
    const handleSWMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
            const { title, body } = event.data.notification;
            notify(title, body, 'info', 8000);
        }
    };

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    // Preload files list
    const filesQuery = new URLSearchParams({
      page: '1',
      limit: '15',
      search: '',
      sort: 'date',
      order: 'desc',
      categoryId: ''
    });
    apiRequest('GET', `/api/files?${filesQuery.toString()}`, true, true).catch(() => {});
    apiRequest('GET', '/api/file-categories', true, true).catch(() => {});

    onCleanup(() => {
        cleanup();
        updateCleanup();
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.removeEventListener('message', handleSWMessage);
        }
    });
  });

  return (
    <>
      <Background />
      <Navbar />
      <main class="container">
        <Show when={isOffline()}>
            <NoInternetPage />
        </Show>
        <div id="solid-root">
          <ErrorBoundary fallback={(err) => {
            console.error("Global App Error:", err);
            return (
              <ErrorView
                id="global-error"
                viewId="error"
                icon={BRIGHTNESS_ALERT_SVG}
                iconClass="critical-error-icon"
                title="Something went wrong"
                message={`We've encountered an unexpected error.<br><small>${err?.message || err}</small>`}
              />
            );
          }}>
            {props.children}
          </ErrorBoundary>
        </div>
      </main>
            <NotificationContainer />
            <Footer />
            <PresidentGoodbyeOverlay />
            <InstallOverlay />
          </>
        );
      }
      
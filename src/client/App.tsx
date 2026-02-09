import { ParentProps, onMount, onCleanup, createSignal, Show, ErrorBoundary } from "solid-js";
import { useNavigate } from "@solidjs/router";
import Navbar from "./components/Navbar";
import Background from "./components/Background";
import NotificationContainer from "./components/NotificationContainer";
import Footer from "./components/Footer";
import { initUpdates } from "./utils/updates";
import { ErrorView, NoInternetPage } from "./pages/ErrorPage";
import { BRIGHTNESS_ALERT_SVG } from "./utils/icons";
import PresidentGoodbyeOverlay from "./components/PresidentGoodbyeOverlay";
import InstallOverlay from "./components/InstallOverlay";
import { NoInternetEvent } from "./utils/events/events";
import { isServerConnected } from "./connection";
import { initPWA } from "./utils/pwa";

import { apiRequest } from "./utils/api";

export default function App(props: ParentProps) {
  const navigate = useNavigate();
  window.solidNavigate = navigate;
  const [isOffline, setIsOffline] = createSignal(!isServerConnected);

  onMount(() => {
    initPWA();
    initUpdates();
    const cleanup = NoInternetEvent.subscribe(() => {
        setIsOffline(!isServerConnected);
    });

    // Preload files list
    const filesQuery = new URLSearchParams({
      page: '1',
      limit: '15',
      search: '',
      sort: 'date',
      order: 'desc',
      categoryId: ''
    });
    apiRequest('GET', `/api/files?${filesQuery.toString()}`, true).catch(() => {});
    apiRequest('GET', '/api/file-categories', true).catch(() => {});

    onCleanup(() => {
        cleanup();
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
          <ErrorBoundary fallback={(err) => (
            <ErrorView
              id="global-error"
              viewId="error"
              icon={BRIGHTNESS_ALERT_SVG}
              iconClass="critical-error-icon"
              title="Something went wrong"
              message={`We've encountered an unexpected error.<br><small>${err?.message || err}</small>`}
            />
          )}>
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
      
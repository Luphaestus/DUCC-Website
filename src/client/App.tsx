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
import { NoInternetEvent } from "./utils/events/events";
import { isServerConnected } from "./connection";

export default function App(props: ParentProps) {
  const navigate = useNavigate();
  window.solidNavigate = navigate;
  const [isOffline, setIsOffline] = createSignal(!isServerConnected);

  onMount(() => {
    initUpdates();
    const cleanup = NoInternetEvent.subscribe(() => {
        setIsOffline(!isServerConnected);
    });
    onCleanup(cleanup);
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
    </>
  );
}
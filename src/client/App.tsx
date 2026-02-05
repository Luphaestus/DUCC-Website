import { ParentProps, onMount, ErrorBoundary } from "solid-js";
import { useNavigate } from "@solidjs/router";
import Navbar from "./components/Navbar";
import Background from "./components/Background";
import NotificationContainer from "./components/NotificationContainer";
import Footer from "./components/Footer";
import { initUpdates } from "./utils/updates";
import { ErrorView } from "./pages/ErrorPage";
import { BRIGHTNESS_ALERT_SVG } from "./utils/icons";
import PresidentGoodbyeOverlay from "./components/PresidentGoodbyeOverlay";

export default function App(props: ParentProps) {
  const navigate = useNavigate();
  window.solidNavigate = navigate;

  onMount(() => {
    initUpdates();
  });

  return (
    <>
      <Background />
      <Navbar />
      <main class="container">
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
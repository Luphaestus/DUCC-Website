import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { A } from "@solidjs/router";
import { apiRequest } from '@/utils/api';
import { addRoute, ViewChangedEvent } from '@/utils/view';
import { BRIGHTNESS_ALERT_SVG, SHIELD_SVG, SIGNAL_DISCONNECTED_SVG } from '@/utils/icons';

// Register routes for the legacy router
// addRoute calls removed

interface ErrorViewProps {
  id: string;
  icon: string;
  title: string;
  message: string;
  viewId: string;
  hidden?: boolean;
}

export function ErrorView(props: ErrorViewProps) {
  const [authStatus, setAuthStatus] = createSignal<{ authenticated: boolean } | null>(null);
  const [checking, setChecking] = createSignal(false);

  const checkAuth = async () => {
    if (props.viewId !== 'no-connection') {
      setChecking(true);
      try {
        const auth = await apiRequest('GET', '/api/auth/status');
        setAuthStatus(auth);
      } catch {
        setAuthStatus({ authenticated: false });
      } finally {
        setChecking(false);
      }
    }
  };

  onMount(() => {
    checkAuth();
  });

  return (
    <div id={props.id} class="view" classList={{ 'hidden': props.hidden ?? false }}>
      <div class="container">
        <div class="error-icon">
          <span innerHTML={props.icon} />
        </div>
        <h1>{props.title}</h1>
        <p innerHTML={props.message} />
        <div class="error-actions">
          <Show when={checking()}>
            <button disabled aria-busy="true" class="secondary outline">Checking...</button>
          </Show>
          <Show when={!checking()}>
            <Show when={props.viewId === 'error'}>
              <A href="/home" class="button">Go to Homepage</A>
            </Show>
            <Show when={props.viewId !== 'error' && props.viewId !== 'no-connection'}>
              <Show when={authStatus()?.authenticated}>
                <A href="/home" class="button">Go to Home</A>
                <A href="/events" class="button secondary outline">View Events</A>
              </Show>
              <Show when={!authStatus()?.authenticated}>
                <A href="/login" class="button">Login</A>
                <A href="/home" class="button secondary outline">Go to Home</A>
              </Show>
            </Show>
            <Show when={props.viewId === 'no-connection'}>
              <A href="/home" class="button">Go to Home</A>
            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <ErrorView
      id="error-view"
      viewId="error"
      icon={BRIGHTNESS_ALERT_SVG}
      title="404 - Page Not Found"
      message="Oops! The page you are looking for does not exist.<br>It might have been moved, deleted, or you may have typed the address incorrectly."
      hidden={false}
    />
  );
}

export function UnauthorisedPage() {
  return (
    <ErrorView
      id="unauthorised-view"
      viewId="unauthorised"
      icon={SHIELD_SVG}
      title="Access Denied"
      message="You do not have permission to view this page."
      hidden={false}
    />
  );
}

export function NoInternetPage() {
  return (
    <ErrorView
      id="no-connection-view"
      viewId="no-connection"
      icon={SIGNAL_DISCONNECTED_SVG}
      title="No Internet Connection"
      message="Please check your network settings.<br>We'll try to reconnect automatically..."
      hidden={false}
    />
  );
}

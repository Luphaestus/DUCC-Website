import { createSignal, createMemo, onMount, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { useAuth } from "../stores/auth";

const navEntries = [
  { name: 'Events', path: '/events', id: 'nav-events' },
  { name: 'Files', path: '/files', id: 'nav-files' },
  { name: 'Swims', path: '/swims', id: 'nav-swims' },
  { name: 'Quotes', path: '/quotes', id: 'nav-quotes' },
  { name: 'Exec', path: '/exec', id: 'nav-exec' },
  { name: 'Admin', path: '/admin', id: 'admin-button', admin: true },
  { name: 'Profile', path: '/profile', id: 'profile-button', auth: true },
  { name: 'Login', path: '/login', id: 'login-button', guest: true },
];

export default function Navbar() {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = createSignal(false);

  const filteredEntries = createMemo(() => {
    const currentUser = user();
    const isLoggedIn = isAuthenticated();
    const isMember = currentUser?.is_member;
    const hasAdmin = isAdmin();

    return navEntries.filter(entry => {
      if (entry.admin) return hasAdmin;
      if (entry.auth) return isLoggedIn;
      if (entry.guest) return !isLoggedIn;
      if (entry.id === 'nav-quotes') return isMember;
      if (entry.id === 'nav-swims') return isLoggedIn;
      return true;
    });
  });

  return (
    <>
      <nav class="small-container" classList={{ 'mobile-open': isMobileOpen() }}>
        <A href="/home" class="nav-logo logo-link" id="nav-home">
          <img src="/images/misc/ducc.png" alt="DUCC Logo" />
        </A>

        <div class="hamburger-menu" onClick={() => setIsMobileOpen(!isMobileOpen())}>
          <span class="hamburger-inner"></span>
        </div>

        <div class="nav-links">
          <ul class="navbar-items main-items">
            <For each={filteredEntries().filter(e => !['profile-button', 'login-button', 'admin-button'].includes(e.id))}>
              {(entry) => (
                <li>
                  <A href={entry.path} class="contrast" activeClass="active" onClick={() => setIsMobileOpen(false)}>
                    {entry.name}
                  </A>
                </li>
              )}
            </For>
          </ul>
          <ul class="navbar-items user-items">
             <For each={filteredEntries().filter(e => ['profile-button', 'login-button', 'admin-button'].includes(e.id))}>
              {(entry) => (
                <li>
                  <A href={entry.path} class="contrast" activeClass="active" onClick={() => setIsMobileOpen(false)}>
                    {entry.id === 'profile-button' && user()?.swims !== undefined 
                      ? `Profile (${user()?.swims})` 
                      : entry.name}
                  </A>
                </li>
              )}
            </For>
          </ul>
        </div>
      </nav>
      <Show when={isMobileOpen()}>
        <div id="mobile-menu-overlay" onClick={() => setIsMobileOpen(false)} style="display: block;"></div>
      </Show>
    </>
  );
}

import { createSignal, createMemo, onMount, onCleanup, For, Show, createEffect, createResource } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import { useAuth } from "../stores/auth";
import LiquidButton, { GlassButtonSmall } from "./LiquidButton";
import { apiRequest } from "@/utils/api";

const navEntries = [
  { name: 'Events', path: '/events', id: 'nav-events' },
  { name: 'Files', path: '/files', id: 'nav-files' },
  { name: 'Swims', path: '/swims', id: 'nav-swims' },
  { name: 'Quotes', path: '/quotes', id: 'nav-quotes' },
  { name: 'Exec', path: '/exec', id: 'nav-exec' },
  { name: 'Admin', path: '/admin', id: 'admin-button', admin: true },
  { name: 'Profile', path: '/profile', id: 'profile-button', auth: true },
  // Login is handled separately as a button
];

export default function Navbar() {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = createSignal(false);
  const [isScrolled, setIsScrolled] = createSignal(false);
  const location = useLocation();

  const [logo] = createResource(async () => {
    try {
      const res = await apiRequest('GET', '/api/globals/ClubLogo');
      return res.res?.ClubLogo?.data || "/api/files/1/download?view=true";
    } catch {
      return "/api/files/1/download?view=true";
    }
  });
  
  // Spotlight effect state
  const [spotlightStyle, setSpotlightStyle] = createSignal({ opacity: 0, left: 0, width: 0 });
  let navListRef: HTMLUListElement | undefined;

  const filteredEntries = createMemo(() => {
    const currentUser = user();
    const isLoggedIn = isAuthenticated();
    const isMember = currentUser?.is_member;
    const hasAdmin = isAdmin();

    return navEntries.filter(entry => {
      if (entry.admin) return hasAdmin;
      if (entry.auth) return isLoggedIn;
      // if (entry.guest) return !isLoggedIn; // Login button separate
      if (entry.id === 'nav-quotes') return isMember;
      if (entry.id === 'nav-swims') return isLoggedIn;
      return true;
    });
  });

  const handleScroll = () => {
    setIsScrolled(window.scrollY > 20);
  };

  const updateSpotlight = (target: HTMLElement | null) => {
    if (!target || !navListRef) {
        setSpotlightStyle(prev => ({ ...prev, opacity: 0 }));
        return;
    }
    
    const navRect = navListRef.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    setSpotlightStyle({
        opacity: 1,
        left: targetRect.left - navRect.left,
        width: targetRect.width
    });
  };

  onMount(() => {
    window.addEventListener('scroll', handleScroll);
    handleScroll();
  });

  onCleanup(() => {
    window.removeEventListener('scroll', handleScroll);
  });

  // Watch location changes to update spotlight active state (optional, or just use hover)
  // For this "wonky" version, let's make the spotlight follow hover strictly for fun
  
  return (
    <>
      <nav 
        class="small-container" 
        classList={{ 
            'mobile-open': isMobileOpen(), 
            'scrolled': isScrolled() 
        }}
      >
        <div 
            class="liquid-container nav-glass-wrapper" 
            style={{ 
                '--liquid-blur': isScrolled() ? '16px' : '8px',
                '--liquid-padding': '0px',
                transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
        >
            <div class="nav-inner-content">
                <A href="/home" class="nav-logo" id="nav-home">
                  <img src={logo() || "/api/files/1/download?view=true"} alt="DUCC Logo" />
                </A>

                {/* Desktop Nav */}
                <div class="desktop-nav">
                    <div class="nav-pills-wrapper">
                        <div 
                            class="nav-spotlight" 
                            style={{ 
                                opacity: spotlightStyle().opacity,
                                transform: `translateX(${spotlightStyle().left}px)`,
                                width: `${spotlightStyle().width}px`
                            }} 
                        />
                        <ul 
                            class="nav-pills" 
                            ref={navListRef}
                            onMouseLeave={() => setSpotlightStyle(prev => ({ ...prev, opacity: 0 }))}
                        >
                            <For each={filteredEntries()}>
                                {(entry) => (
                                <li>
                                    <A 
                                        href={entry.path} 
                                        class="nav-link" 
                                        activeClass="active"
                                        onMouseEnter={(e) => updateSpotlight(e.currentTarget)}
                                    >
                                    {entry.id === 'profile-button' && user()?.swims !== undefined 
                                        ? `Profile (${user()?.swims})` 
                                        : entry.name}
                                    </A>
                                </li>
                                )}
                            </For>
                        </ul>
                    </div>
                    
                    <div class="auth-action">
                        <Show when={!isAuthenticated()}>
                             <A href="/login" class="login-link-wrapper">
                                <GlassButtonSmall 
                                    class="login-btn"
                                    borderRadius={99}
                                    tintOpacity={0.4}
                                >
                                    Login
                                </GlassButtonSmall>
                             </A>
                        </Show>
                    </div>
                </div>

                <div class="hamburger-menu" onClick={() => setIsMobileOpen(!isMobileOpen())}>
                  <div class="hamburger-box">
                    <span class="hamburger-inner"></span>
                  </div>
                </div>
            </div>
        </div>

        {/* Mobile Nav Dropdown */}
        <div class="mobile-nav-container">
            <div 
                class="liquid-container mobile-nav-glass" 
                style={{ 
                    '--liquid-border-radius': '24px',
                    '--liquid-blur': '24px',
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    'flex-direction': 'column', 
                    padding: '1rem' 
                }}
            >
                <ul class="mobile-items">
                <For each={filteredEntries()}>
                    {(entry) => (
                    <li>
                        <A href={entry.path} class="mobile-link" activeClass="active" onClick={() => setIsMobileOpen(false)}>
                            {entry.id === 'profile-button' && user()?.swims !== undefined 
                            ? `Profile (${user()?.swims})` 
                            : entry.name}
                        </A>
                    </li>
                    )}
                </For>
                <Show when={!isAuthenticated()}>
                    <li>
                        <A href="/login" class="mobile-link highlight" onClick={() => setIsMobileOpen(false)}>
                            Login
                        </A>
                    </li>
                </Show>
                </ul>
            </div>
        </div>
      </nav>
      
      <Show when={isMobileOpen()}>
        <div id="mobile-menu-overlay" onClick={() => setIsMobileOpen(false)}></div>
      </Show>
    </>
  );
}


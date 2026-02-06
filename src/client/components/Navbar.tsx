import { createSignal, createMemo, onMount, onCleanup, For, Show, createEffect } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import { useAuth } from "../stores/auth";
import LiquidContainer from "./LiquidContainer";
import LiquidButton, { GlassButtonSmall } from "./LiquidButton";

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
        <LiquidContainer 
            class="nav-glass-wrapper" 
            borderRadius={999} 
            tintOpacity={isScrolled() ? 0.6 : 0.1}
            blurAmount={isScrolled() ? 0.3 : 0.1}
            edgeIntensity={0.4}
            padding="0" // Padding handled by inner layout
            style={{ 
                transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
        >
            <div class="nav-inner-content">
                <A href="/home" class="nav-logo" id="nav-home">
                  <img src="/images/misc/ducc.png" alt="DUCC Logo" />
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
        </LiquidContainer>

        {/* Mobile Nav Dropdown */}
        <div class="mobile-nav-container">
            <LiquidContainer 
                class="mobile-nav-glass" 
                borderRadius={24} 
                tintOpacity={0.8}
                blurAmount={0.4}
                style={{ width: '100%', height: '100%', display: 'flex', 'flex-direction': 'column', padding: '1rem' }}
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
            </LiquidContainer>
        </div>
      </nav>
      
      <Show when={isMobileOpen()}>
        <div id="mobile-menu-overlay" onClick={() => setIsMobileOpen(false)}></div>
      </Show>
    </>
  );
}


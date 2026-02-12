import { createSignal, createMemo, onMount, onCleanup, For, Show, createEffect, createResource } from "solid-js";
import { A, useLocation, useNavigate } from "@solidjs/router";
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
];

export default function Navbar() {
  const { user, isAdmin, isExec, isAuthenticated } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = createSignal(false);
  const [isScrolled, setIsScrolled] = createSignal(false);
  const navigate = useNavigate();

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
  const [mobileSpotlightStyle, setMobileSpotlightStyle] = createSignal({ opacity: 0, top: 0, height: 0 });
  let navListRef: HTMLUListElement | undefined;
  let mobileNavListRef: HTMLUListElement | undefined;

  const filteredEntries = createMemo(() => {
    const currentUser = user();
    const isLoggedIn = isAuthenticated();
    const isMember = currentUser?.is_member;
    const hasExec = isExec();

    return navEntries.filter(entry => {
      if (entry.admin) return hasExec;
      if (entry.auth) return isLoggedIn;
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

  const updateMobileSpotlight = (target: HTMLElement | null) => {
    if (!target || !mobileNavListRef) {
        setMobileSpotlightStyle(prev => ({ ...prev, opacity: 0 }));
        return;
    }
    
    const navRect = mobileNavListRef.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    setMobileSpotlightStyle({
        opacity: 1,
        top: targetRect.top - navRect.top,
        height: targetRect.height
    });
  };

  onMount(() => {
    window.addEventListener('scroll', handleScroll);
    handleScroll();
  });

  onCleanup(() => {
    window.removeEventListener('scroll', handleScroll);
  });

  return (
    <>
      <nav 
        class="navbar-full-width" 
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
                    
                    <Show when={!isAuthenticated()}>
                        <button 
                            class="login-btn primary" 
                            style={{ "border-radius": "99px" }} 
                            onClick={() => navigate('/login')}
                        >
                            Sign In
                        </button>
                    </Show>
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
                <div class="mobile-items-wrapper">
                    <div 
                        class="mobile-nav-spotlight" 
                        style={{ 
                            opacity: mobileSpotlightStyle().opacity,
                            transform: `translateY(${mobileSpotlightStyle().top}px)`,
                            height: `${mobileSpotlightStyle().height}px`
                        }} 
                    />
                    <ul 
                        class="mobile-items" 
                        ref={mobileNavListRef}
                        onMouseLeave={() => setMobileSpotlightStyle(prev => ({ ...prev, opacity: 0 }))}
                    >
                    <For each={filteredEntries()}>
                        {(entry) => (
                        <li>
                            <A 
                                href={entry.path} 
                                class="mobile-link" 
                                activeClass="active" 
                                onClick={() => setIsMobileOpen(false)}
                                onMouseEnter={(e) => updateMobileSpotlight(e.currentTarget)}
                            >
                                {entry.id === 'profile-button' && user()?.swims !== undefined 
                                ? `Profile (${user()?.swims})` 
                                : entry.name}
                            </A>
                        </li>
                        )}
                    </For>
                    <Show when={!isAuthenticated()}>
                        <li>
                            <A 
                                href="/login" 
                                class="mobile-link highlight" 
                                onClick={() => setIsMobileOpen(false)}
                                onMouseEnter={(e) => updateMobileSpotlight(e.currentTarget)}
                            >
                                Login
                            </A>
                        </li>
                    </Show>
                    </ul>
                </div>
            </div>
        </div>
      </nav>
      
      <Show when={isMobileOpen()}>
        <div id="mobile-menu-overlay" onClick={() => setIsMobileOpen(false)}></div>
      </Show>
    </>
  );
}


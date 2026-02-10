/**
 * view.js
 * 
 * The central router.
 */

import { apiRequest } from './api.js';
import { ViewChangedEvent } from "./events/events.js";
import { hasHistory } from './history.js';
import { incrementModals, decrementModals } from './modal-state.js';

interface Route {
    pattern: string;
    regex: RegExp;
    viewId: string;
    isOverlay: boolean;
    titleFunc: ((path: string) => string) | null;
    changeURL: boolean;
}

const Routes: Route[] = [];
let openURL: string | null = null;
let currentIsOverlay = false;

interface RouteOptions {
    isOverlay?: boolean;
    titleFunc?: (path: string) => string;
    changeURL?: boolean;
}

declare global {
    interface Window {
        solidNavigate?: (path: string) => void;
    }
}

/**
 * Registers a new route in the application. 
 */
export function addRoute(pattern: string, viewId: string, options: RouteOptions = {}) {
    const regexString = '^' + pattern
        .replace(/\//g, '\\/')
        .replace(/:(\w+)/g, '([^/]+)')
        .replace(/\*/g, '.*') + '$';

    Routes.push({
        pattern,
        regex: new RegExp(regexString),
        viewId,
        isOverlay: options.isOverlay || false,
        titleFunc: options.titleFunc || null,
        changeURL: options.changeURL == null ? true : options.changeURL
    });
}

/**
 * find a matching route for a given path. 
 */
export function matchRoute(path: string): Route | null {
    const pathOnly = path.split('?')[0];
    return Routes.find(route => route.regex.test(pathOnly)) || null;
}

/**
 * Checks if path is different to current path.
 */
function isCurrentPath(path: string): boolean {
    return (window.location.pathname + window.location.search) === path;
}

/**
 * Switches to new view
 */
function switchView(path: string, force: boolean = false): boolean {
    if (window.solidNavigate) {
        window.solidNavigate(path);
        return true;
    }

    console.log(`Requested navigation to: ${path}`);
    if (!path.startsWith('/')) path = '/' + path;

    // Handle root path: redirect to events if logged in, home if not
    if (path === '/') {
        apiRequest('GET', '/api/auth/status', null, true).then((data: any) => {
            if (data.authenticated) switchView('/events');
            else switchView('/home');
        }).catch(() => switchView('/home'));
        return true;
    }


    const route = matchRoute(path);

    if (isCurrentPath(path) && !force) return true;

    console.error(`Navigating to: ${path}`);
    if (!route) {
        if (!isCurrentPath(path)) {
            window.history.pushState(null, '', path);
        }
        return true;
    }

    if (!isCurrentPath(path) && route.changeURL) {
        window.history.pushState(null, '', path);
    }

    if (route.isOverlay) {
        openURL = window.location.pathname + window.location.search;
        if (!currentIsOverlay) {
            incrementModals();
            currentIsOverlay = true;
        }
    } else {
        if (currentIsOverlay) {
            decrementModals();
            currentIsOverlay = false;
        }
    }

    const allViews = document.querySelectorAll('.view');
    let targetFound = false;
    allViews.forEach(el => {
        if (el.id === route.viewId + '-view') {
            el.classList.remove('hidden');
            targetFound = true;
        } else {
            const viewId = el.id.replace('-view', '');
            const viewRoutes = Routes.filter(r => r.viewId === viewId);
            const isAnyRouteOverlay = viewRoutes.some(r => r.isOverlay);
            const isAnyRouteMatching = viewRoutes.some(r => r.regex.test(window.location.pathname));

            if (isAnyRouteOverlay) {
                if (!isAnyRouteMatching) {
                    el.classList.add('hidden');
                }
            } else if (!route.isOverlay) {
                el.classList.add('hidden');
            }
        }
    });

    if (!targetFound && !route.isOverlay) {
        console.warn(`View element not found for route: ${route.viewId}. If this is a Solid route, it's expected.`);
    }

    ViewChangedEvent.notify({
        resolvedPath: route.pattern,
        viewId: route.viewId,
        path
    });

    if (route.titleFunc !== null) {
        const title = route.titleFunc(path);
        if (title && title.length > 0)
            document.title = title;
    } else {
        const baseLocation = path.match(/\/([a-zA-Z]*)/);
        if (baseLocation && baseLocation[1]) {
            const formatedBase = baseLocation[1].charAt(0).toUpperCase() + baseLocation[1].slice(1);
            document.title = `DUCC - ${formatedBase}`;
        } else {
            document.title = `DUCC`;
        }
    }

    return true;
}

/**
 * Closes the current modal view with animation and returns to previous state.
 * 
 * @param {string} [fallbackPath='/'] - Path to navigate to if no history exists.
 */
function closeModal(fallbackPath: string = '/') {
    const path = window.location.pathname + window.location.search;
    const route = matchRoute(path);

    if (route && route.isOverlay) {
        const viewEl = document.getElementById(route.viewId + '-view');
        if (viewEl) {
            viewEl.classList.add('closing');

            const onAnimationEnd = () => {
                viewEl.classList.remove('closing');
                viewEl.removeEventListener('animationend', onAnimationEnd);

                const urlParams = new URLSearchParams(window.location.search);
                const explicitBack = urlParams.get('back') || urlParams.get('return');

                if (openURL) {
                    switchView(openURL);
                    openURL = null;
                } else if (explicitBack) {
                    switchView(explicitBack);
                } else if (hasHistory()) {
                    window.history.back();
                } else {
                    switchView(fallbackPath);
                }
            };

            viewEl.addEventListener('animationend', onAnimationEnd, { once: true });
            return;
        }
    }

    if (hasHistory()) window.history.back();
    else switchView(fallbackPath);
}

/**
 * Triggered on popstate (browser back/forward) or initial load.
 */
function updateContent() {
    switchView(window.location.pathname + window.location.search, true);
}

window.onpopstate = updateContent;
window.onload = updateContent;

// Expose switchView to the global scope for inline onclick handlers
(window as any).switchView = switchView;
(window as any).closeModal = closeModal;

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const link = target.closest('[data-nav]') as HTMLElement | null;
        if (link) {
            e.preventDefault();
            switchView(link.dataset.nav!);
        }
    });
});

export { switchView, closeModal, ViewChangedEvent, isCurrentPath };

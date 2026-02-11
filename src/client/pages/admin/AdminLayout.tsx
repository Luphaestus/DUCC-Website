// todo clean up
import { createResource, Show, onMount, createEffect, ParentProps, createMemo } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import { useAuth } from "@/stores/auth";
import AdminNavBar from "@/components/admin/AdminNavBar";
import { apiRequest } from "@/utils/api";

export default function AdminLayout(props: ParentProps) {
    const { user, isAuthenticated, isExec } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [globals] = createResource(async () => {
        try {
            return await apiRequest('GET', '/api/globals/status');
        } catch {
            return null;
        }
    });

    createEffect(() => {
        if (!user.loading) {
            if (!isAuthenticated()) {
                navigate('/login');
            } else if (!isExec()) {
                navigate('/unauthorised');
            }
        }
    });

    const isDashboard = createMemo(() => location.pathname === '/admin' || location.pathname === '/admin/');
    const isDetailsPage = createMemo(() => location.pathname.includes('/user/') || location.pathname.includes('/event/') || location.pathname.includes('/tag/') || location.pathname.includes('/role/'));
    const hasNav = createMemo(() => !!user() && !user.loading);

    const pageTitle = createMemo(() => {
        const path = location.pathname;
        if (path.includes('/users')) return 'Members';
        if (path.includes('/events')) return 'Events';
        if (path.includes('/files')) return 'Documents';
        if (path.includes('/quotes')) return 'Quotes';
        if (path.includes('/tags')) return 'Categories';
        if (path.includes('/roles')) return 'Access Roles';
        if (path.includes('/slides')) return 'Slideshow';
        if (path.includes('/globals')) return 'Settings';
        if (path.includes('/kit')) return 'Inventory';
        if (path.includes('/stats')) return 'Analytics';
        return 'Dashboard';
    });

    return (
        <div id="admin-view" class="view glass-layout">
            <header class="admin-header-modern">
                <h1 id="admin-dashboard-title">
                    Admin <span class="admin-title-section">{pageTitle()}</span>
                </h1>
            </header>
            
            <Show when={hasNav() && !isDashboard() && !isDetailsPage()}>
                <div class="liquid-container glass-toolbar" style={{ "--liquid-padding": "0.5rem 1rem", "--liquid-border-radius": "100px", "margin-bottom": "0" }}>
                    <div class="toolbar-left">
                        <AdminNavBar 
                            permissions={user()!.permissions} 
                            isPresident={!!globals()} 
                        />
                    </div>
                    <div class="toolbar-right">
                        <div id="admin-header-actions" class="header-actions"></div>
                    </div>
                </div>
            </Show>

            <div id="admin-content-wrapper" class="admin-content-wrapper">
                 {props.children}
            </div>
        </div>
    );
}

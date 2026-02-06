import { createResource, Show, onMount, createEffect, ParentProps, createMemo } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import { useAuth } from "@/stores/auth";
import AdminNavBar from "@/components/admin/AdminNavBar";
import { apiRequest } from "@/utils/api";
import LiquidContainer from "@/components/LiquidContainer";

export default function AdminLayout(props: ParentProps) {
    const { user, isAuthenticated, isAdmin } = useAuth();
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
            } else if (!isAdmin()) {
                navigate('/unauthorised');
            }
        }
    });

    const isDashboard = createMemo(() => location.pathname === '/admin' || location.pathname === '/admin/');
    const isDetailsPage = createMemo(() => location.pathname.includes('/user/') || location.pathname.includes('/event/') || location.pathname.includes('/tag/') || location.pathname.includes('/role/'));
    const hasNav = createMemo(() => !!user() && !user.loading);

    return (
        <div id="admin-view" class="view glass-layout">
            <header class="admin-header-modern">
                <h1 id="admin-dashboard-title">
                    Admin <span class="admin-title-section">Dashboard</span>
                </h1>
            </header>
            
            <Show when={hasNav() && !isDashboard() && !isDetailsPage()}>
                <LiquidContainer class="glass-toolbar" padding="0.5rem 1rem" borderRadius={100}>
                    <div class="toolbar-left">
                        <AdminNavBar 
                            permissions={user()!.permissions} 
                            isPresident={!!globals()} 
                        />
                    </div>
                    <div class="toolbar-right">
                        <div id="admin-header-actions" class="header-actions"></div>
                    </div>
                </LiquidContainer>
            </Show>

            <div id="admin-content-wrapper" class="admin-content-wrapper">
                 {props.children}
            </div>
        </div>
    );
}

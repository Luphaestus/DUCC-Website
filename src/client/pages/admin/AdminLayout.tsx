import { createResource, Show, createEffect, ParentProps, createMemo } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import { useAuth } from "@/stores/auth";
import AdminNavBar from "@/components/admin/AdminNavBar";
import { apiRequest } from "@/utils/api";
import PageTitle from "@/components/PageTitle";
import { ADMIN_MODULES } from "@/utils/adminConfig";

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
        const module = ADMIN_MODULES.find(m => path.startsWith(m.href));
        return module ? module.title : 'Dashboard';
    });

    return (
        <div id="admin-view" class="view glass-layout">
            <header class="admin-header-modern" style={{ "justify-content": "center", "text-align": "center" }}>
                <PageTitle text={`Admin ${pageTitle()}`} centered />
            </header>

            <Show when={hasNav() && !isDashboard() && !isDetailsPage()}>
                <div class="liquid-container glass-toolbar" style={{ "margin-bottom": "0" }}>
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
            </Show >

            <div id="admin-content-wrapper" class="admin-content-wrapper">
                {props.children}
            </div>
        </div >
    );
}

import { createMemo, Show } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import { TabNav } from "@/widgets/TabNav";

interface AdminNavBarProps {
    permissions: string[];
    isPresident: boolean;
}

export default function AdminNavBar(props: AdminNavBarProps) {
    const location = useLocation();
    
    const canManageUsers = createMemo(() => props.permissions.includes('user.manage') || props.permissions.includes('transaction.manage') || props.permissions.length > 0);
    const canManageEvents = createMemo(() => props.permissions.includes('event.manage.all') || props.permissions.includes('event.manage.scoped'));
    const canManageTags = createMemo(() => props.permissions.includes('event.manage.all') || props.permissions.includes('event.manage.scoped'));
    const canManageFiles = createMemo(() => props.permissions.includes('document.write') || props.permissions.includes('document.edit'));
    const canManageQuotes = createMemo(() => props.permissions.includes('quote.manage'));
    const canManageRoles = createMemo(() => props.permissions.includes('role.manage'));
    const canManageKit = createMemo(() => props.permissions.includes('kit.manage'));
    const canViewStats = createMemo(() => props.permissions.includes('transaction.manage') || props.permissions.includes('event.manage.all'));
    const isExec = createMemo(() => props.permissions.length > 0);
    const isPresident = () => props.isPresident;

    const isActive = (path: string) => location.pathname.startsWith(path);

    return (
        <TabNav class="admin-nav-group" id="admin-main-nav">
            <Show when={canManageUsers()}>
                <A href="/admin/users" class={`tab-btn ${isActive('/admin/users') ? 'active' : ''}`}>Users</A>
            </Show>
            <Show when={canManageEvents()}>
                <A href="/admin/events" class={`tab-btn ${isActive('/admin/events') ? 'active' : ''}`}>Events</A>
            </Show>
            <Show when={canManageTags()}>
                <A href="/admin/tags" class={`tab-btn ${isActive('/admin/tags') ? 'active' : ''}`}>Tags</A>
            </Show>
            <Show when={canManageFiles()}>
                <A href="/admin/files" class={`tab-btn ${isActive('/admin/files') ? 'active' : ''}`}>Files</A>
            </Show>
            <Show when={canManageQuotes()}>
                <A href="/admin/quotes" class={`tab-btn ${isActive('/admin/quotes') ? 'active' : ''}`}>Quotes</A>
            </Show>
            <Show when={canManageRoles()}>
                <A href="/admin/roles" class={`tab-btn ${isActive('/admin/roles') ? 'active' : ''}`}>Roles</A>
            </Show>
            <Show when={canManageKit()}>
                <A href="/admin/kit" class={`tab-btn ${isActive('/admin/kit') ? 'active' : ''}`}>Kit</A>
            </Show>
            <Show when={canViewStats()}>
                <A href="/admin/stats" class={`tab-btn ${isActive('/admin/stats') ? 'active' : ''}`}>Stats</A>
            </Show>
            <Show when={isExec()}>
                <A href="/admin/slides" class={`tab-btn ${isActive('/admin/slides') ? 'active' : ''}`}>Slides</A>
            </Show>
            <Show when={isPresident()}>
                <A href="/admin/globals" class={`tab-btn ${isActive('/admin/globals') ? 'active' : ''}`}>Globals</A>
            </Show>
        </TabNav>
    );
}

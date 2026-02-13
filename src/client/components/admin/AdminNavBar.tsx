import { createMemo, Show } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import { TabNav } from "@/widgets/TabNav";

interface AdminNavBarProps {
    permissions: string[];
    isPresident: boolean;
}

export default function AdminNavBar(props: AdminNavBarProps) {
    const location = useLocation();
    
    const perms = () => props.permissions || [];
    const canManageUsers = createMemo(() => perms().includes('user.manage') || perms().includes('transaction.manage') || perms().includes('user.read'));
    const canManageEvents = createMemo(() => perms().includes('event.manage.all') || perms().includes('event.manage.scoped'));
    const canManageTags = createMemo(() => perms().includes('event.manage.all') || perms().includes('event.manage.scoped') || perms().includes('tag.write'));
    const canManageFiles = createMemo(() => perms().includes('file.write') || perms().includes('file.edit') || perms().includes('file.category.manage'));
    const canManageQuotes = createMemo(() => perms().includes('quote.manage'));
    const canManageRoles = createMemo(() => perms().includes('role.manage'));
    const canManageKit = createMemo(() => perms().includes('kit.manage'));
    const canViewStats = createMemo(() => perms().includes('transaction.manage') || perms().includes('event.manage.all') || perms().includes('site.admin'));
    const canManageSlides = createMemo(() => perms().includes('exec.publish') || perms().includes('site.admin'));
    const canManageForms = createMemo(() => perms().includes('form.manage') || perms().includes('site.admin'));
    const canSendEmails = createMemo(() => perms().includes('email.send') || perms().includes('site.admin'));
    const canManageElections = createMemo(() => perms().includes('election.manage') || perms().includes('site.admin'));
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
            <Show when={canSendEmails()}>
                <A href="/admin/emails" class={`tab-btn ${isActive('/admin/emails') ? 'active' : ''}`}>Emails</A>
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
            <Show when={canManageForms()}>
                <A href="/admin/forms" class={`tab-btn ${isActive('/admin/forms') ? 'active' : ''}`}>Forms</A>
            </Show>
            <Show when={canManageElections()}>
                <A href="/admin/elections" class={`tab-btn ${isActive('/admin/elections') ? 'active' : ''}`}>Elections</A>
            </Show>
            <Show when={canManageSlides()}>
                <A href="/admin/slides" class={`tab-btn ${isActive('/admin/slides') ? 'active' : ''}`}>Slides</A>
            </Show>
            <Show when={isPresident()}>
                <A href="/admin/globals" class={`tab-btn ${isActive('/admin/globals') ? 'active' : ''}`}>Globals</A>
            </Show>
        </TabNav>
    );
}

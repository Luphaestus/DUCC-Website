import { createMemo } from "solid-js";
import { A } from "@solidjs/router";
import { useAuth } from "@/stores/auth";
import {
    GROUP_SVG, CALENDAR_TODAY_SVG, LOCAL_ACTIVITY_SVG,
    ID_CARD_SVG, SETTINGS_SVG, FOLDER_SVG, IMAGE_SVG
} from '@/utils/icons';

export default function DashboardPage() {
    const { user } = useAuth();
    
    const permissions = createMemo(() => user()?.permissions || []);
    const canManageUsers = createMemo(() => permissions().includes('user.manage') || permissions().includes('transaction.manage') || permissions().length > 0);
    const canManageEvents = createMemo(() => permissions().includes('event.manage.all') || permissions().includes('event.manage.scoped'));
    const canManageTags = createMemo(() => permissions().includes('event.manage.all') || permissions().includes('event.manage.scoped'));
    const canManageFiles = createMemo(() => permissions().includes('document.write') || permissions().includes('document.edit'));
    const canManageQuotes = createMemo(() => permissions().includes('quote.manage'));
    const canManageRoles = createMemo(() => permissions().includes('role.manage'));
    const isExec = createMemo(() => permissions().length > 0);
    const canAccessGlobals = createMemo(() => true);

    const Card = (props: { title: string, desc: string, icon: string, href: string }) => (
        <A href={props.href} class="dashboard-card">
            <div class="card-icon" innerHTML={props.icon} />
            <div class="card-content">
                <h3>{props.title}</h3>
                <p>{props.desc}</p>
            </div>
        </A>
    );

    return (
        <div class="glass-layout">
            <header class="admin-header-modern">
                <h1>Admin <span class="admin-title-section">Dashboard</span></h1>
            </header>

            <div class="dashboard-grid">
                {canManageUsers() && <Card title="Users" desc="Manage members & permissions" icon={GROUP_SVG} href="/admin/users" />}
                {isExec() && <Card title="Slides" desc="Homepage slideshow" icon={IMAGE_SVG} href="/admin/slides" />}
                {canManageEvents() && <Card title="Events" desc="Schedule & attendance" icon={CALENDAR_TODAY_SVG} href="/admin/events" />}
                {canManageTags() && <Card title="Tags" desc="Event categories & styles" icon={LOCAL_ACTIVITY_SVG} href="/admin/tags" />}
                {canManageFiles() && <Card title="Files" desc="Documents & resources" icon={FOLDER_SVG} href="/admin/files" />}
                {canManageQuotes() && <Card title="Quotes" desc="Moderate club quotes" icon={LOCAL_ACTIVITY_SVG} href="/admin/quotes" />}
                {canManageRoles() && <Card title="Roles" desc="User roles & access" icon={ID_CARD_SVG} href="/admin/roles" />}
                {canAccessGlobals() && <Card title="Globals" desc="System configuration" icon={SETTINGS_SVG} href="/admin/globals" />}
            </div>
        </div>
    );
}

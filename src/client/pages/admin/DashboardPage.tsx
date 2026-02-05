import { createMemo } from "solid-js";
import { A } from "@solidjs/router";
import { useAuth } from "@/stores/auth";
import {
    GROUP_SVG, CALENDAR_TODAY_SVG, LOCAL_ACTIVITY_SVG,
    ID_CARD_SVG, SETTINGS_SVG, FOLDER_SVG, IMAGE_SVG,
    KAYAKING_SVG, TRENDING_UP_SVG, LIST_SVG, FORMAT_QUOTE_SVG
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
    const canManageKit = createMemo(() => permissions().includes('kit.manage'));
    const canViewStats = createMemo(() => permissions().includes('transaction.manage') || permissions().includes('event.manage.all'));
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
            <div class="dashboard-grid">
                {canManageUsers() && <Card title="Users" desc="Manage members & permissions" icon={GROUP_SVG} href="/admin/users" />}
                {isExec() && <Card title="Slides" desc="Homepage slideshow" icon={IMAGE_SVG} href="/admin/slides" />}
                {canManageEvents() && <Card title="Events" desc="Schedule & attendance" icon={CALENDAR_TODAY_SVG} href="/admin/events" />}
                {canManageTags() && <Card title="Tags" desc="Event categories & styles" icon={LIST_SVG} href="/admin/tags" />}
                {canManageFiles() && <Card title="Files" desc="Documents & resources" icon={FOLDER_SVG} href="/admin/files" />}
                {canManageQuotes() && <Card title="Quotes" desc="Moderate club quotes" icon={FORMAT_QUOTE_SVG} href="/admin/quotes" />}
                {canManageRoles() && <Card title="Roles" desc="User roles & access" icon={ID_CARD_SVG} href="/admin/roles" />}
                {canManageKit() && <Card title="Kit" desc="Club equipment inventory" icon={KAYAKING_SVG} href="/admin/kit" />}
                {canViewStats() && <Card title="Stats" desc="Club usage analytics" icon={TRENDING_UP_SVG} href="/admin/stats" />}
                {canAccessGlobals() && <Card title="Globals" desc="System configuration" icon={SETTINGS_SVG} href="/admin/globals" />}
            </div>
        </div>
    );
}

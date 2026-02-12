// todo clean up
import { createMemo } from "solid-js";
import { A } from "@solidjs/router";
import { useAuth } from "@/stores/auth";
import {
    GROUP_SVG, CALENDAR_TODAY_SVG, LOCAL_ACTIVITY_SVG,
    ID_CARD_SVG, SETTINGS_SVG, FOLDER_SVG, IMAGE_SVG,
    KAYAKING_SVG, TRENDING_UP_SVG, LIST_SVG, FORMAT_QUOTE_SVG
} from '@/utils/icons';
import PageTitle from "@/components/PageTitle";

export default function DashboardPage() {
    const { user } = useAuth();
    
    const perms = createMemo(() => user()?.permissions || []);
    const canManageUsers = createMemo(() => perms().includes('user.manage') || perms().includes('transaction.manage') || perms().length > 0);
    const canManageEvents = createMemo(() => perms().includes('event.manage.all') || perms().includes('event.manage.scoped'));
    const canManageTags = createMemo(() => perms().includes('event.manage.all') || perms().includes('event.manage.scoped'));
    const canManageFiles = createMemo(() => perms().includes('file.write') || perms().includes('file.edit'));
    const canManageQuotes = createMemo(() => perms().includes('quote.manage'));
    const canManageRoles = createMemo(() => perms().includes('role.manage'));
    const canManageKit = createMemo(() => perms().includes('kit.manage'));
    const canViewStats = createMemo(() => perms().includes('transaction.manage') || perms().includes('event.manage.all'));
    const isExec = createMemo(() => perms().length > 0);
    const canAccessGlobals = createMemo(() => true);

    const Card = (props: { title: string, desc: string, icon: string, href: string }) => (
        <A href={props.href} class="dashboard-card panel-transparent" style={{ "border-radius": "32px" }}>
            <div class="card-icon" innerHTML={props.icon} />
            <div class="card-content">
                <h3>{props.title}</h3>
                <p>{props.desc}</p>
            </div>
        </A>
    );

    return (
        <div class="glass-layout">
            <PageTitle text="Admin Dashboard" centered={true} />
            <div class="dashboard-grid mt-6">
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

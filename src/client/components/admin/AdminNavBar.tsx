import { createMemo, For } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import { TabNav } from "@/widgets/TabNav";
import { ADMIN_MODULES } from "@/utils/adminConfig";

interface AdminNavBarProps {
    permissions: string[];
    isPresident: boolean;
}

export default function AdminNavBar(props: AdminNavBarProps) {
    const location = useLocation();
    
    const perms = () => props.permissions || [];
    const isPresident = () => props.isPresident;

    const visibleModules = createMemo(() => 
        ADMIN_MODULES.filter(m => m.isVisible(perms(), isPresident()))
    );

    const isActive = (path: string) => location.pathname.startsWith(path);

    return (
        <TabNav class="admin-nav-group" id="admin-main-nav">
            <For each={visibleModules()}>
                {m => (
                    <A href={m.href} class={`tab-btn ${isActive(m.href) ? 'active' : ''}`}>{m.title}</A>
                )}
            </For>
        </TabNav>
    );
}

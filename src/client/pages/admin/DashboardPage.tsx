import { createMemo, For, createResource } from "solid-js";
import { A } from "@solidjs/router";
import { useAuth } from "@/stores/auth";
import { ADMIN_MODULES } from "@/utils/adminConfig";
import { apiRequest } from "@/utils/api";

export default function DashboardPage() {
    const { user } = useAuth();
    
    const [globals] = createResource(async () => {
        try {
            return await apiRequest('GET', '/api/globals/status');
        } catch {
            return null;
        }
    });

    const perms = createMemo(() => user()?.permissions || []);
    const isPresident = () => !!globals();

    const visibleModules = createMemo(() => 
        ADMIN_MODULES.filter(m => m.isVisible(perms(), isPresident()))
    );

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
            <div class="dashboard-grid">
                <For each={visibleModules()}>
                    {m => <Card title={m.title} desc={m.desc} icon={m.icon} href={m.href} />}
                </For>
            </div>
        </div>
    );
}

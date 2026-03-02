// todo clean up
import { createSignal, createResource, Show, onMount, onCleanup, For } from "solid-js";
import { apiRequest } from "@/utils/api";
import { FaSolidPlus, FaSolidSwimmingPool, FaSolidTrophy } from 'solid-icons/fa';
import { onUpdate } from "@/utils/updates";
import SwimActionModal from "@/components/SwimActionModal";

export default function SwimsTab(props: { user: any, typeFilter?: 'swim' | 'bootie', compactManage?: boolean }) {
    const [isLogSwimModalOpen, setIsLogSwimModalOpen] = createSignal(false);
    const [isLogBootieModalOpen, setIsLogBootieModalOpen] = createSignal(false);

    onMount(() => {
        const cleanup = onUpdate((event) => {
            if (event.type === 'swims_update') {
                refetchStats();
                refetchHistory();
            }
        });
        onCleanup(cleanup);
    });

    const [stats, { refetch: refetchStats }] = createResource(
        () => props.user?.id,
        async (id) => {
            if (!id) return { yearly: { swims: 0, booties: 0, rank: -1 }, allTime: { swims: 0, booties: 0, rank: -1 } };
            const res = await apiRequest('GET', `/api/user/${id}/swims/stats`);
            return res.data || { yearly: { swims: 0, booties: 0, rank: -1 }, allTime: { swims: 0, booties: 0, rank: -1 } };
        }
    );

    const [history, { refetch: refetchHistory }] = createResource(
        () => ({ userId: props.user?.id, typeFilter: props.typeFilter }),
        async ({ userId, typeFilter }) => {
            if (!userId) return [];
            const res = await apiRequest('GET', `/api/user/${userId}/swims/history`);
            const rows = res.data || [];
            if (!typeFilter) return rows;
            if (typeFilter === 'bootie') return rows.filter((item: any) => !!item.is_bootie);
            return rows.filter((item: any) => !item.is_bootie);
        }
    );

    return (
        <div class="swims-management-layout">
            <Show when={props.compactManage && !props.typeFilter} fallback={
                <div class="item-list scrollable-list swim-history-list">
                    <For each={history()} fallback={<p class="text-muted">No {props.typeFilter || 'swim'} history found.</p>}>
                        {(item) => (
                            <div class="list-item" classList={{ 'primary-glass': !!item.is_bootie }}>
                                <div class="item-details">
                                    <span class="item-title">{item.message || '(No explanation)'}</span>
                                    <span class="item-subtitle">
                                        {item.count} swim{item.count > 1 ? 's' : ''} • {new Date(item.created_at).toLocaleDateString()} by {item.added_by_name}
                                    </span>
                                </div>
                            </div>
                        )}
                    </For>
                </div>
            }>
                <div class="liquid-container no-margin swim-manage-squares">
                    <div class="stats-grid compact">
                        <div class="stat-item">
                            <span class="stat-value small">
                                <Show when={!stats.loading} fallback="...">{stats()?.yearly?.swims || 0}</Show>
                            </span>
                            <span class="stat-label">Yearly Swims</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value small">
                                <Show when={!stats.loading} fallback="...">{stats()?.yearly?.booties || 0}</Show>
                            </span>
                            <span class="stat-label">Yearly Booties</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value small">
                                <Show when={!stats.loading} fallback="...">{stats()?.allTime?.swims || 0}</Show>
                            </span>
                            <span class="stat-label">Total Swims</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value small">
                                <Show when={!stats.loading} fallback="...">{stats()?.allTime?.booties || 0}</Show>
                            </span>
                            <span class="stat-label">Total Booties</span>
                        </div>
                    </div>

                    <div class="admin-swim-actions">
                        <button class="small-btn primary" onClick={() => setIsLogSwimModalOpen(true)}>
                            <FaSolidPlus /> Log Swim
                        </button>
                        <button class="small-btn secondary" onClick={() => setIsLogBootieModalOpen(true)}>
                            <FaSolidTrophy /> Log Bootie
                        </button>
                    </div>
                </div>
            </Show>

            <SwimActionModal
                isOpen={isLogSwimModalOpen()}
                mode="swim"
                onClose={() => setIsLogSwimModalOpen(false)}
                onSuccess={() => {
                    refetchStats();
                    refetchHistory();
                }}
                initialUser={{
                    id: props.user.id,
                    first_name: props.user.first_name,
                    last_name: props.user.last_name
                }}
            />

            <SwimActionModal
                isOpen={isLogBootieModalOpen()}
                mode="bootie"
                onClose={() => setIsLogBootieModalOpen(false)}
                onSuccess={() => {
                    refetchStats();
                    refetchHistory();
                }}
                initialUser={{
                    id: props.user.id,
                    first_name: props.user.first_name,
                    last_name: props.user.last_name
                }}
            />
        </div>
    );
}

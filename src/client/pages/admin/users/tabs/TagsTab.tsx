import { createResource, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { LOCAL_ACTIVITY_SVG, SHIELD_SVG } from '@/utils/icons';
import Panel from "@/components/Panel";

export default function TagsTab(props: { userId: number }) {
    const { notify } = useNotifications();

    const [data, { refetch }] = createResource(
        () => props.userId,
        async (id) => {
            if (!id || isNaN(id)) {
                return { allTags: [], whitelisted: [], managed: [] };
            }
            const [allTagsRes, whitelistedRes, userRes] = await Promise.all([
                apiRequest('GET', '/api/tags'),
                apiRequest('GET', `/api/user/${id}/tags`),
                apiRequest('GET', `/api/admin/user/${id}`)
            ]);
            return {
                allTags: allTagsRes.data || [],
                whitelisted: whitelistedRes || [],
                managed: userRes.direct_managed_tags || []
            };
        }
    );

    const toggleWhitelist = async (tagId: number, isAdding: boolean) => {
        if (!props.userId) return;
        try {
            if (isAdding) await apiRequest('POST', `/api/tags/${tagId}/whitelist`, { userId: props.userId });
            else await apiRequest('DELETE', `/api/tags/${tagId}/whitelist/${props.userId}`);
            notify('Success', isAdding ? 'User whitelisted' : 'Whitelist removed', 'success');
            refetch();
        } catch (e) { notify('Error', 'Update failed', 'error'); }
    };

    const toggleManaged = async (tagId: number, isAdding: boolean) => {
        if (!props.userId) return;
        try {
            if (isAdding) await apiRequest('POST', `/api/admin/user/${props.userId}/managed_tag`, { tagId });
            else await apiRequest('DELETE', `/api/admin/user/${props.userId}/managed_tag/${tagId}`);
            notify('Success', isAdding ? 'Tag scope added' : 'Tag scope removed', 'success');
            refetch();
        } catch (e) { notify('Error', 'Update failed', 'error'); }
    };

    const TagGrid = (p: { tags: any[], activeIds: number[], onToggle: (id: number, active: boolean) => void }) => (
        <div class="tags-selection-grid">
            <For each={p.tags}>
                {tag => {
                    const isActive = () => p.activeIds.includes(tag.id);
                    return (
                        <label class="tag-checkbox">
                            <input type="checkbox" checked={isActive()} onChange={e => p.onToggle(tag.id, e.currentTarget.checked)} style="display:none;" />
                            <span class="tag-badge" classList={{ selected: isActive() }} style={{ "--tag-colour": tag.color, "background-color": "var(--tag-colour)" }}>
                                {tag.name}
                            </span>
                        </label>
                    );
                }}
            </For>
        </div>
    );

    return (
        <div class="profile-layout-grid">
            <Show when={data()} fallback={<p>Loading tags...</p>}>
                {res => (
                    <>
                        <div class="column">
                            <Panel title="Whitelisted Tags" icon={LOCAL_ACTIVITY_SVG}>
                                <p class="helper-text">Tags this user is explicitly whitelisted for.</p>
                                <TagGrid tags={res().allTags} activeIds={res().whitelisted.map((t:any) => t.id)} onToggle={toggleWhitelist} />
                            </Panel>
                        </div>
                        <div class="column">
                            <Panel title="Managed Tags (Scoped)" icon={SHIELD_SVG}>
                                <p class="helper-text">Tags this user can manage events for.</p>
                                <TagGrid tags={res().allTags} activeIds={res().managed.map((t:any) => t.id)} onToggle={toggleManaged} />
                            </Panel>
                        </div>
                    </>
                )}
            </Show>
        </div>
    );
}

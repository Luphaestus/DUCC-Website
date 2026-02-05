import { createResource, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNavigate } from "@solidjs/router";
import { Tag } from "@/widgets/Tag";

interface TagData {
    id: number;
    name: string;
    color: string;
    min_difficulty: number | null;
    description: string | null;
}

export default function TagsPage() {
    const navigate = useNavigate();

    const [tags] = createResource(async () => {
        const res = await apiRequest('GET', '/api/tags');
        return res.data as TagData[];
    });

    return (
        <div class="glass-layout">
            <div class="glass-toolbar">
                 <div class="toolbar-content">
                    <div class="toolbar-left hidden"></div>
                    <div class="toolbar-right">
                        <button onClick={() => navigate('/admin/tag/new')} class="small-btn">Create New Tag</button>
                    </div>
                </div>
            </div>
            <div class="glass-table-container">
                <div class="table-responsive">
                    <table class="glass-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Colour</th>
                                <th>Min Difficulty</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <Show when={tags.loading}>
                                <tr><td colspan="4" class="loading-cell">Loading...</td></tr>
                            </Show>
                            <Show when={!tags.loading && tags()?.length === 0}>
                                <tr><td colspan="4" class="empty-cell">No tags found.</td></tr>
                            </Show>
                            <For each={tags()}>
                                {(tag) => (
                                    <tr class="tag-row clickable-row" onClick={() => navigate(`/admin/tag/${tag.id}`)}>
                                        <td data-label="Name" class="primary-text">{tag.name}</td>
                                        <td data-label="Colour">
                                            {/* We use the Tag component or simple badge */}
                                            <span class="badge" style={{ "background-color": tag.color }}>{tag.name}</span>
                                        </td>
                                        <td data-label="Min Difficulty">
                                            <span class={`badge ${tag.min_difficulty ? `difficulty-${tag.min_difficulty}` : 'neutral'}`}>
                                                {tag.min_difficulty || '-'}
                                            </span>
                                        </td>
                                        <td data-label="Description" class="description-cell">{tag.description || '-'}</td>
                                    </tr>
                                )}
                            </For>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

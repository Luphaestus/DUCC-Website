// todo clean up
import { createSignal, createResource, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import Modal from "@/components/Modal";
import UploadWidget from "@/components/UploadWidget";
import { IMAGE_SVG, DELETE_SVG, ADD_SVG, DRAG_HANDLE_SVG } from '@/utils/icons';

interface Slide {
    id: number;
    url: string;
}

export default function SlidesPage() {
    const { notify } = useNotifications();
    const [showUpload, setShowUpload] = createSignal(false);
    const [draggedId, setDraggedId] = createSignal<number | null>(null);

    const [slides, { refetch, mutate }] = createResource(async () => {
        const res = await apiRequest('GET', '/api/slides/images');
        return res.slides as Slide[];
    });

    const handleDelete = async (fileId: number) => {
        try {
            await apiRequest('DELETE', '/api/slides', { fileId });
            notify('Success', 'Slide deleted', 'success');
            refetch();
        } catch (e: any) {
            notify('Error', e.message || 'Failed to delete slide', 'error');
        }
    };

    const handleDragStart = (id: number) => {
        setDraggedId(id);
    };

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (targetId: number) => {
        const id = draggedId();
        if (id === null || id === targetId) return;

        const currentSlides = [...(slides() || [])];
        const dragIdx = currentSlides.findIndex(s => s.id === id);
        const targetIdx = currentSlides.findIndex(s => s.id === targetId);

        if (dragIdx === -1 || targetIdx === -1) return;

        // Reorder locally first
        const [moved] = currentSlides.splice(dragIdx, 1);
        currentSlides.splice(targetIdx, 0, moved);
        mutate(currentSlides);

        try {
            const orders = currentSlides.map((s, i) => ({ fileId: s.id, order: i }));
            await apiRequest('PUT', '/api/slides/reorder', { orders });
        } catch (e: any) {
            notify('Error', 'Failed to save new order', 'error');
            refetch();
        }
        setDraggedId(null);
    };

    return (
        <div class="glass-layout">
            <div class="glass-toolbar">
                 {/* AdminNavBar is handled by Layout */}
            </div>
            
            <div class="panel">
                <div class="panel-header">
                    <h3><span innerHTML={IMAGE_SVG} /> Manage Slideshow</h3>
                    <div class="panel-actions">
                        <button class="main-btn small-btn" onClick={() => setShowUpload(true)}>
                            <span innerHTML={ADD_SVG} /> Add Slide
                        </button>
                    </div>
                </div>
                <div class="panel-content">
                    <div id="slides-grid" class="image-grid mt-2">
                        <Show when={slides.loading}>
                            <p class="loading-cell">Loading slides...</p>
                        </Show>
                        <Show when={!slides.loading && slides()?.length === 0}>
                            <p class="empty-cell">No slides found.</p>
                        </Show>
                        <For each={slides()}>
                            {(slide) => (
                                <div 
                                    class="image-item slide-item slide-item-bg" 
                                    style={{ '--slide-url': `url('${slide.url}')` }}
                                    draggable={true}
                                    onDragStart={() => handleDragStart(slide.id)}
                                    onDragOver={handleDragOver}
                                    onDrop={() => handleDrop(slide.id)}
                                    classList={{ 'is-dragging': draggedId() === slide.id }}
                                >
                                    <div class="drag-handle" innerHTML={DRAG_HANDLE_SVG} />
                                    <div class="slide-actions">
                                        <button class="delete-slide-btn delete-icon-btn" onClick={() => handleDelete(slide.id)} title="Delete Slide" innerHTML={DELETE_SVG} />
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </div>
            </div>

            <Modal isOpen={showUpload()} onClose={() => setShowUpload(false)} title="Add Slide" maxWidth="800px">
                <UploadWidget 
                    selectMode="single"
                    autoUpload={true}
                    enableLibrary={true}
                    onImageSelect={async ({ id }) => {
                        if (id) {
                            try {
                                await apiRequest('POST', '/api/slides/import', { fileId: id });
                                notify('Success', 'Slide added', 'success');
                                setShowUpload(false);
                                refetch();
                            } catch (e: any) {
                                notify('Error', e.message, 'error');
                            }
                        }
                    }}
                />
            </Modal>
        </div>
    );
}

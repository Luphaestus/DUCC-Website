// todo clean up
import { createSignal, createResource, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import Modal from "@/components/Modal";
import UploadWidget from "@/components/UploadWidget";
import { IMAGE_SVG, DELETE_SVG, ADD_SVG } from '@/utils/icons';

interface Slide {
    id: number;
    url: string;
}

export default function SlidesPage() {
    const { notify } = useNotifications();
    const [showUpload, setShowUpload] = createSignal(false);

    const [slides, { refetch }] = createResource(async () => {
        const res = await apiRequest('GET', '/api/slides/images');
        return res.slides as Slide[];
    });

    const handleDelete = async (fileId: number) => {
        if (!confirm('Are you sure you want to delete this slide?')) return;
        try {
            await apiRequest('DELETE', '/api/slides', { fileId });
            notify('Success', 'Slide deleted', 'success');
            refetch();
        } catch (e: any) {
            notify('Error', e.message || 'Failed to delete slide', 'error');
        }
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
                                <div class="image-item slide-item slide-item-bg" style={{ '--slide-url': `url('${slide.url}')` }}>
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
                    onUploadComplete={async (id) => {
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

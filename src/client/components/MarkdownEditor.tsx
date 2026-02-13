import { createSignal, Show } from "solid-js";
import Markdown from "./Markdown";
import {
    EDIT_SVG, IMAGE_SVG, ADD_SVG,
    DESCRIPTION_SVG, CLOSE_SVG
} from '@/utils/icons';
import { UploadWidget } from "@/widgets/upload/UploadWidget";

interface MarkdownEditorProps {
    value: string;
    onInput: (value: string) => void;
    placeholder?: string;
    rows?: number;
}

export default function MarkdownEditor(props: MarkdownEditorProps) {
    const [preview, setPreview] = createSignal(false);
    let textareaRef: HTMLTextAreaElement | undefined;

    const insertText = (before: string, after: string = "") => {
        if (!textareaRef) return;
        const start = textareaRef.selectionStart;
        const end = textareaRef.selectionEnd;
        const text = textareaRef.value;
        const selectedText = text.substring(start, end);
        const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
        props.onInput(newText);

        // Reset focus and selection
        setTimeout(() => {
            textareaRef!.focus();
            textareaRef!.setSelectionRange(start + before.length, end + before.length);
        }, 0);
    };

    const handleImageUpload = () => {
        const widget = new UploadWidget(document.createElement('div'), {
            mode: 'hidden',
            onImageSelect: ({ id }) => {
                const url = `/api/files/${id}/download?view=true`;
                insertText(`![image](${url})`);
            }
        });
        widget.inputEl.click();
    };

    return (
        <div class="markdown-editor-container liquid-container glass-panel no-padding overflow-hidden">
            <div class="editor-toolbar flex-row-gap-half p-2 border-bottom">
                <button type="button" class="toolbar-btn" onClick={() => setPreview(!preview())} title={preview() ? "Edit" : "Preview"}>
                    <span innerHTML={preview() ? EDIT_SVG : DESCRIPTION_SVG} />
                </button>
                <div class="toolbar-divider" />
                <Show when={!preview()}>
                    <button type="button" class="toolbar-btn" onClick={() => insertText("**", "**")} title="Bold"><strong>B</strong></button>
                    <button type="button" class="toolbar-btn" onClick={() => insertText("*", "*")} title="Italic"><em>I</em></button>
                    <button type="button" class="toolbar-btn" onClick={() => insertText("# ", "")} title="Heading">H</button>
                    <button type="button" class="toolbar-btn" onClick={() => insertText("- ", "")} title="List">•</button>
                    <button type="button" class="toolbar-btn" onClick={() => insertText("[", "](url)")} title="Link">L</button>
                    <button type="button" class="toolbar-btn" onClick={handleImageUpload} title="Upload Image">
                        <span innerHTML={IMAGE_SVG} />
                    </button>
                </Show>
            </div>

            <div class="editor-content">
                <Show when={!preview()} fallback={
                    <div class="p-4 min-h-textarea bg-alt rounded-bottom">
                        <Markdown content={props.value || "*No content to preview*"} />
                    </div>
                }>
                    <textarea
                        ref={textareaRef}
                        class="markdown-textarea full-width no-border p-4 bg-transparent"
                        rows={props.rows || 10}
                        value={props.value}
                        onInput={(e) => props.onInput(e.currentTarget.value)}
                        placeholder={props.placeholder}
                    />
                </Show>
            </div>

            <style>{`
                .markdown-editor-container {
                    border: 1px solid rgba(var(--pico-color-rgb), 0.1);
                }
                .editor-toolbar {
                    background: rgba(var(--pico-color-rgb), 0.03);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .toolbar-btn {
                    width: 32px;
                    height: 32px;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: transparent;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    color: var(--pico-color);
                    transition: background 0.2s;
                }
                .toolbar-btn:hover {
                    background: rgba(var(--pico-color-rgb), 0.1);
                }
                .toolbar-divider {
                    width: 1px;
                    height: 20px;
                    background: rgba(var(--pico-color-rgb), 0.1);
                    margin: 0 0.25rem;
                }
                .markdown-textarea {
                    font-family: 'Outfit', sans-serif;
                    resize: vertical;
                    min-height: 200px;
                    outline: none;
                    line-height: 1.6;
                }
                .min-h-textarea {
                    min-height: 200px;
                }
                .toolbar-btn svg {
                    width: 18px;
                    height: 18px;
                }
            `}</style>
        </div>
    );
}

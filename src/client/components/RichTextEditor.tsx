import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { UploadWidget } from "@/widgets/upload/UploadWidget";
import {
    FORMAT_BOLD_SVG, FORMAT_ITALIC_SVG, FORMAT_UNDERLINED_SVG, FORMAT_STRIKETHROUGH_SVG,
    FORMAT_LIST_BULLETED_SVG, FORMAT_LIST_NUMBERED_SVG, FORMAT_ALIGN_LEFT_SVG,
    FORMAT_ALIGN_CENTER_SVG, FORMAT_ALIGN_RIGHT_SVG, FORMAT_H1_SVG, FORMAT_H2_SVG,
    HIGHLIGHT_SVG, PALETTE_SVG, IMAGE_SVG, DESCRIPTION_SVG, EDIT_SVG,
    HISTORY_UNDO_SVG, HISTORY_REDO_SVG, LINK_SVG
} from "@/utils/icons";

interface RichTextEditorProps {
    value: string;
    onInput: (value: string) => void;
    placeholder?: string;
}

export default function RichTextEditor(props: RichTextEditorProps) {
    let editorElement: HTMLDivElement | undefined;
    let editor: Editor | null = null;
    const [isActive, setIsActive] = createSignal<Record<string, boolean>>({});
    const [showLinkInput, setShowLinkInput] = createSignal(false);
    const [linkUrl, setLinkUrl] = createSignal('');
    let linkInputRef: HTMLInputElement | undefined;

    const colors = ['#000000', '#7E317B', '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'];

    onMount(() => {
        if (!editorElement) return;

        editor = new Editor({
            element: editorElement,
            extensions: [
                StarterKit,
                Underline,
                TextStyle,
                Color,
                Highlight.configure({ multicolor: true }),
                Image,
                Link.configure({
                    openOnClick: false,
                    autolink: true,
                    // The link extension does not have a native UI. We will manage it
                    // The default behavior is to toggle the mark when a link is detected in pasted content
                    // Or when pressing Space/Enter after a URL.
                }),
                TextAlign.configure({
                    types: ['heading', 'paragraph'],
                }),
                Placeholder.configure({
                    placeholder: props.placeholder || 'Start typing...',
                }),
            ],
            content: props.value,
            onUpdate: ({ editor }) => {
                props.onInput(editor.getHTML());
                updateActiveStates();
            },
            onSelectionUpdate: () => {
                updateActiveStates();
            },
            editorProps: {
                attributes: {
                    class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4',
                },
            },
        });
    });

    const updateActiveStates = () => {
        if (!editor) return;
        setIsActive({
            bold: editor.isActive('bold'),
            italic: editor.isActive('italic'),
            underline: editor.isActive('underline'),
            strike: editor.isActive('strike'),
            bulletList: editor.isActive('bulletList'),
            orderedList: editor.isActive('orderedList'),
            h1: editor.isActive('heading', { level: 1 }),
            h2: editor.isActive('heading', { level: 2 }),
            left: editor.isActive({ textAlign: 'left' }),
            center: editor.isActive({ textAlign: 'center' }),
            right: editor.isActive({ textAlign: 'right' }),
            highlight: editor.isActive('highlight'),
            undo: editor.can().undo(),
            redo: editor.can().redo(),
            link: editor.isActive('link'),
        });
        // If a link is active, set the linkUrl for display/editing
        if (editor.isActive('link')) {
            setLinkUrl(editor.getAttributes('link').href || '');
        } else {
            setLinkUrl('');
        }
    };

    onCleanup(() => {
        if (editor) {
            editor.destroy();
        }
    });

    const toggleBold = () => editor?.chain().focus().toggleBold().run();
    const toggleItalic = () => editor?.chain().focus().toggleItalic().run();
    const toggleUnderline = () => editor?.chain().focus().toggleUnderline().run();
    const toggleStrike = () => editor?.chain().focus().toggleStrike().run();
    const toggleBulletList = () => editor?.chain().focus().toggleBulletList().run();
    const toggleOrderedList = () => editor?.chain().focus().toggleOrderedList().run();
    const toggleH1 = () => editor?.chain().focus().toggleHeading({ level: 1 }).run();
    const toggleH2 = () => editor?.chain().focus().toggleHeading({ level: 2 }).run();
    const setAlignLeft = () => editor?.chain().focus().setTextAlign('left').run();
    const setAlignCenter = () => editor?.chain().focus().setTextAlign('center').run();
    const setAlignRight = () => editor?.chain().focus().setTextAlign('right').run();
    const toggleHighlight = () => editor?.chain().focus().toggleHighlight().run();

    const setColor = (color: string) => editor?.chain().focus().setColor(color).run();

    const undo = () => editor?.chain().focus().undo().run();
    const redo = () => editor?.chain().focus().redo().run();

    const applyLink = () => {
        if (editor) {
            const url = linkUrl();
            // empty link: unset
            if (url === '') {
                editor.chain().focus().unsetLink().run();
                return;
            }
            // update link
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
            setShowLinkInput(false);
        }
    };

    const toggleLink = () => {
        if (editor && editor.isActive('link')) {
            editor.chain().focus().unsetLink().run();
            setShowLinkInput(false);
            setLinkUrl('');
            return;
        }
        setShowLinkInput(!showLinkInput());
        if (!showLinkInput()) { // if we're hiding it, clear the URL
            setLinkUrl('');
        } else { // if showing, try to pre-fill with existing link
            if (editor && editor.getAttributes('link').href) {
                setLinkUrl(editor.getAttributes('link').href);
            } else {
                setLinkUrl(''); // empty if no existing link
            }
            setTimeout(() => linkInputRef?.focus(), 0); // Focus input after it renders
        }
    };

    const handleImageUpload = () => {
        const widget = new UploadWidget(document.createElement('div'), {
            mode: 'hidden',
            onImageSelect: ({ id }) => {
                const url = `/api/files/${id}/download?view=true`;
                editor?.chain().focus().setImage({ src: url }).run();
            }
        });
        widget.inputEl.click();
    };

    return (
        <div class="rich-text-editor liquid-container glass-panel no-padding overflow-hidden" style={{ border: "1px solid rgba(var(--pico-color-rgb), 0.1)" }}>
            <div class="editor-toolbar p-2 border-bottom flex flex-wrap gap-1 bg-[rgba(var(--pico-color-rgb),0.03)]">
                <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" classList={{ active: isActive().bold }} onClick={toggleBold} title="Bold"><span innerHTML={FORMAT_BOLD_SVG} /></button>
                    <button type="button" class="toolbar-btn" classList={{ active: isActive().italic }} onClick={toggleItalic} title="Italic"><span innerHTML={FORMAT_ITALIC_SVG} /></button>
                    <button type="button" class="toolbar-btn" classList={{ active: isActive().underline }} onClick={toggleUnderline} title="Underline"><span innerHTML={FORMAT_UNDERLINED_SVG} /></button>
                    <button type="button" class="toolbar-btn" classList={{ active: isActive().strike }} onClick={toggleStrike} title="Strikethrough"><span innerHTML={FORMAT_STRIKETHROUGH_SVG} /></button>
                </div>

                <div class="toolbar-divider"></div>

                <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" classList={{ active: isActive().h1 }} onClick={toggleH1} title="Heading 1"><span innerHTML={FORMAT_H1_SVG} /></button>
                    <button type="button" class="toolbar-btn" classList={{ active: isActive().h2 }} onClick={toggleH2} title="Heading 2"><span innerHTML={FORMAT_H2_SVG} /></button>
                </div>

                <div class="toolbar-divider"></div>

                <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" classList={{ active: isActive().bulletList }} onClick={toggleBulletList} title="Bullet List"><span innerHTML={FORMAT_LIST_BULLETED_SVG} /></button>
                    <button type="button" class="toolbar-btn" classList={{ active: isActive().orderedList }} onClick={toggleOrderedList} title="Ordered List"><span innerHTML={FORMAT_LIST_NUMBERED_SVG} /></button>
                </div>

                <div class="toolbar-divider"></div>

                <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" classList={{ active: isActive().left }} onClick={setAlignLeft} title="Align Left"><span innerHTML={FORMAT_ALIGN_LEFT_SVG} /></button>
                    <button type="button" class="toolbar-btn" classList={{ active: isActive().center }} onClick={setAlignCenter} title="Align Center"><span innerHTML={FORMAT_ALIGN_CENTER_SVG} /></button>
                    <button type="button" class="toolbar-btn" classList={{ active: isActive().right }} onClick={setAlignRight} title="Align Right"><span innerHTML={FORMAT_ALIGN_RIGHT_SVG} /></button>
                </div>

                <div class="toolbar-divider"></div>

                <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" classList={{ active: isActive().undo }} onClick={undo} title="Undo"><span innerHTML={HISTORY_UNDO_SVG} /></button>
                    <button type="button" class="toolbar-btn" classList={{ active: isActive().redo }} onClick={redo} title="Redo"><span innerHTML={HISTORY_REDO_SVG} /></button>
                </div>

                <div class="toolbar-divider"></div>

                <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" classList={{ active: isActive().highlight }} onClick={toggleHighlight} title="Highlight"><span innerHTML={HIGHLIGHT_SVG} /></button>
                    <div class="color-picker-dropdown">
                        <button type="button" class="toolbar-btn" title="Text Color"><span innerHTML={PALETTE_SVG} /></button>
                        <div class="color-palette">
                            {colors.map(c => (
                                <div class="color-swatch" style={{ background: c }} onClick={() => setColor(c)} />
                            ))}
                        </div>
                    </div>
                </div>

                <div class="toolbar-divider"></div>

                <div class="toolbar-group">
                    <button type="button" class="toolbar-btn" classList={{ active: isActive().link }} onClick={toggleLink} title="Link"><span innerHTML={LINK_SVG} /></button>
                    <button type="button" class="toolbar-btn" onClick={handleImageUpload} title="Upload Image"><span innerHTML={IMAGE_SVG} /></button>
                </div>
            </div>

            <Show when={showLinkInput()}>
                <div class="link-input-container p-2 border-bottom bg-[rgba(var(--pico-color-rgb),0.03)] flex gap-2 items-center">
                    <input
                        type="url"
                        ref={linkInputRef}
                        class="form-control mini-input flex-grow"
                        placeholder="Enter URL"
                        value={linkUrl()}
                        onInput={(e) => setLinkUrl(e.currentTarget.value)}
                        onKeyPress={(e) => { if (e.key === 'Enter') applyLink(); }}
                    />
                    <button type="button" class="small-btn primary" onClick={applyLink}>Apply</button>
                    <button type="button" class="small-btn secondary" onClick={() => setShowLinkInput(false)}>Cancel</button>
                </div>
            </Show>

            <div ref={editorElement} class="editor-content bg-transparent min-h-[200px]" />

            <style>{`
                .editor-toolbar {
                    display: flex;
                    align-items: center;
                    padding: 0.5rem;
                    border-bottom: 1px solid rgba(var(--pico-color-rgb), 0.1);
                    background: rgba(var(--pico-color-rgb), 0.02);
                    gap: 0.25rem;
                    flex-wrap: wrap;
                }
                .toolbar-group {
                    display: flex;
                    gap: 0.125rem;
                }
                .toolbar-btn {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: transparent;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    color: var(--pico-color);
                    opacity: 0.7;
                    transition: all 0.2s;
                    padding: 0;
                }
                .toolbar-btn:hover, .toolbar-btn.active {
                    background: rgba(var(--pico-color-rgb), 0.1);
                    opacity: 1;
                }
                .toolbar-btn.active {
                    background: rgba(var(--pico-primary-rgb), 0.1);
                    color: var(--pico-primary);
                }
                .toolbar-btn svg {
                    width: 20px;
                    height: 20px;
                    fill: currentColor;
                }
                .toolbar-divider {
                    width: 1px;
                    height: 24px;
                    background: rgba(var(--pico-color-rgb), 0.1);
                    margin: 0 0.25rem;
                }
                .ProseMirror {
                    outline: none;
                    padding: 1rem;
                    min-height: 200px;
                }
                .ProseMirror p.is-editor-empty:first-child::before {
                    color: #adb5bd;
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                }
                .color-picker-dropdown {
                    position: relative;
                    display: inline-block;
                }
                .color-picker-dropdown:hover .color-palette {
                    display: grid;
                }
                .color-palette {
                    display: none;
                    position: absolute;
                    top: 100%;
                    left: 0;
                    background: var(--pico-background-color);
                    border: 1px solid rgba(var(--pico-color-rgb), 0.1);
                    border-radius: 8px;
                    padding: 8px;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 4px;
                    z-index: 100;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .color-swatch {
                    width: 20px;
                    height: 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    border: 1px solid rgba(0,0,0,0.1);
                }
                .ProseMirror h1 { font-size: 1.75em; font-weight: 700; margin-bottom: 0.5em; }
                .ProseMirror h2 { font-size: 1.4em; font-weight: 600; margin-bottom: 0.5em; }
                .ProseMirror ul { list-style-type: disc; padding-left: 1.5em; }
                .ProseMirror ol { list-style-type: decimal; padding-left: 1.5em; }
                .ProseMirror img { max-width: 100%; border-radius: 8px; margin: 1em 0; }
                .ProseMirror mark { background-color: #f1c40f; color: black; padding: 0 2px; border-radius: 2px; }
            `}</style>
        </div>
    );
}

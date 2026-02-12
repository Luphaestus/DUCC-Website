import { createMemo } from "solid-js";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface MarkdownProps {
    content: string;
    class?: string;
}

export default function Markdown(props: MarkdownProps) {
    const renderedContent = createMemo(() => {
        if (!props.content) return "";
        try {
            // Configure marked to handle common use cases
            const rawHtml = marked.parse(props.content, {
                gfm: true,
                breaks: true,
            });
            // Sanitise the HTML
            return DOMPurify.sanitize(rawHtml as string);
        } catch (e) {
            console.error("Markdown parse error:", e);
            return props.content;
        }
    });

    return (
        <div 
            class={`markdown-body ${props.class || ""}`} 
            innerHTML={renderedContent()} 
        />
    );
}

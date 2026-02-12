import { Show } from "solid-js";

interface PageTitleProps {
    text: string;
    class?: string;
    style?: any;
    children?: any;
    centered?: boolean;
}

export default function PageTitle(props: PageTitleProps) {
    const words = () => props.text.trim().split(/\s+/);
    const hasMultipleWords = () => words().length >= 2;
    
    return (
        <h1 
            class={`page-title ${props.class || ''}`} 
            style={{ 
                "text-align": props.centered ? "center" : "left", 
                "justify-content": props.centered ? "center" : "flex-start",
                ...props.style 
            }}
        >
            <Show when={hasMultipleWords()} fallback={props.text}>
                <span style={{ color: "var(--pico-primary)" }}>{words()[0]}</span> {words().slice(1).join(" ")}
            </Show>
            {props.children}
        </h1>
    );
}

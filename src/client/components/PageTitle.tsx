import { Show } from "solid-js";
import { Dynamic } from "solid-js/web";

interface PageTitleProps {
    text: string;
    class?: string;
    style?: any;
    children?: any;
    centered?: boolean;
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div";
}

export default function PageTitle(props: PageTitleProps) {
    const words = () => props.text.trim().split(/\s+/);
    const hasMultipleWords = () => words().length >= 2;
    
    return (
        <Dynamic 
            component={props.as || "h1"}
            class={`page-title ${props.class || ''}`} 
            style={{ 
                "text-align": props.centered ? "center" : "left", 
                "justify-content": props.centered ? "center" : "flex-start",
                ...props.style 
            }}
        >
            <Show when={hasMultipleWords()} fallback={props.text}>
                {words()[0]} <span style={{ color: "var(--pico-primary)", "-webkit-text-fill-color": "var(--pico-primary)" }}>{words().slice(1).join(" ")}</span>
            </Show>
            {props.children}
        </Dynamic>
    );
}

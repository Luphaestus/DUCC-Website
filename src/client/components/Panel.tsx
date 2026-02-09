import { JSX, ParentProps, Show } from "solid-js";

interface PanelProps extends ParentProps {
    id?: string;
    title?: string | JSX.Element;
    icon?: string | JSX.Element;
    action?: JSX.Element;
    class?: string;
    style?: any;
    titleCentered?: boolean;
}

export default function Panel(props: PanelProps) {
    return (
        <div
            class={`liquid-container panel-widget ${props.class || ''}`}
            style={{
                '--liquid-border-radius': '24px',
                ...props.style
            }}
        >
            <Show when={props.title}>
                <header class="box-header" style={props.titleCentered ? { "justify-content": "center", "position": "relative" } : {}}>
                    <h3 style={props.titleCentered ? { "justify-content": "center", "width": "100%", "text-align": "center" } : {}}>
                        <Show when={props.icon}>
                            <Show when={typeof props.icon === 'string'} fallback={props.icon}>
                                <span innerHTML={props.icon as string} />
                            </Show>
                        </Show>
                        {props.title}
                    </h3>
                    <Show when={props.action}>
                        <div class="panel-actions" style={props.titleCentered ? { "position": "absolute", "right": "0" } : {}}>
                            {props.action}
                        </div>
                    </Show>
                </header>
            </Show>
            {props.children}
        </div>
    );
}

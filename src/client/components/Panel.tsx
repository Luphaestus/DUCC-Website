import { JSX, ParentProps, Show } from "solid-js";

interface PanelProps extends ParentProps {
    id?: string;
    title?: string | JSX.Element;
    icon?: string | JSX.Element;
    action?: JSX.Element;
    class?: string;
    style?: any;
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
            <article id={props.id} class="panel-transparent">
                <Show when={props.title}>
                    <header class="box-header">
                        <h3>
                            <Show when={props.icon}>
                                <Show when={typeof props.icon === 'string'} fallback={props.icon}>
                                    <span innerHTML={props.icon as string} />
                                </Show>
                            </Show>
                            {props.title}
                        </h3>
                        <Show when={props.action}>
                            {props.action}
                        </Show>
                    </header>
                </Show>
                {props.children}
            </article>
        </div>
    );
}

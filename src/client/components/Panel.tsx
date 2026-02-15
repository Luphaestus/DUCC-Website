import { JSX, ParentProps, Show } from "solid-js";

interface PanelProps extends ParentProps {
    id?: string;
    title?: string | JSX.Element;
    icon?: string | JSX.Element;
    action?: JSX.Element;
    leftAction?: JSX.Element;
    class?: string;
    style?: any;
    titleCentered?: boolean;
    noHeaderBorder?: boolean;
}

export default function Panel(props: PanelProps) {
    return (
        <div
            class={`liquid-container panel-container ${props.class || ''}`}
        >
            <Show when={props.title || props.action || props.leftAction}>
                <header 
                    class="box-header" 
                    classList={{ 'no-border': props.noHeaderBorder }}
                >
                    <Show when={props.leftAction}>
                        <div class="panel-left-actions">
                            {props.leftAction}
                        </div>
                    </Show>
                    
                    <Show when={props.title}>
                        <h3 classList={{ centered: props.titleCentered }}>
                            <Show when={props.icon}>
                                <Show when={typeof props.icon === 'string'} fallback={props.icon}>
                                    <span class="icon" innerHTML={props.icon as string} />
                                </Show>
                            </Show>
                            {props.title}
                        </h3>
                    </Show>
                    
                    <Show when={props.action}>
                        <div class="panel-actions">
                            {props.action}
                        </div>
                    </Show>
                </header>
            </Show>
            {props.children}
        </div>
    );
}

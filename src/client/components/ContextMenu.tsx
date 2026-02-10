import { JSX, createSignal, onMount, onCleanup, Show, createEffect } from "solid-js";
import { Portal } from "solid-js/web";

interface ContextMenuProps {
    x: number;
    y: number;
    isOpen: boolean;
    onClose: () => void;
    children: JSX.Element;
    header?: string;
}

export default function ContextMenu(props: ContextMenuProps) {
    let menuRef: HTMLDivElement | undefined;
    const [adjustedPos, setAdjustedPos] = createSignal({ x: props.x, y: props.y });

    const handleClickOutside = (e: MouseEvent) => {
        if (menuRef && !menuRef.contains(e.target as Node)) {
            props.onClose();
        }
    };

    createEffect(() => {
        if (props.isOpen) {
            // Ensure menu stays within viewport
            const menuWidth = 200; // Estimated
            const menuHeight = 250; // Estimated
            
            let newX = props.x;
            let newY = props.y;

            if (newX + menuWidth > window.innerWidth) newX -= menuWidth;
            if (newY + menuHeight > window.innerHeight) newY -= menuHeight;

            setAdjustedPos({ x: newX, y: newY });

            window.addEventListener('mousedown', handleClickOutside);
            onCleanup(() => window.removeEventListener('mousedown', handleClickOutside));
        }
    });

    return (
        <Portal>
            <Show when={props.isOpen}>
                <div 
                    ref={menuRef}
                    class="context-menu glass-panel" 
                    style={{ 
                        position: 'fixed',
                        top: `${adjustedPos().y}px`, 
                        left: `${adjustedPos().x}px`,
                        "z-index": 10000,
                        display: 'flex',
                        "flex-direction": 'column',
                        gap: '2px',
                        padding: '0.5rem',
                        "min-width": '180px'
                    }}
                >
                    {props.header && (
                        <div class="cm-header" style={{
                            padding: '0.5rem 0.75rem',
                            "font-weight": 800,
                            "font-size": '0.85rem',
                            color: 'var(--pico-primary)',
                            "text-transform": 'uppercase',
                            "letter-spacing": '0.5px',
                            "border-bottom": '1px solid rgba(255, 255, 255, 0.05)',
                            "margin-bottom": '0.25rem'
                        }}>
                            {props.header}
                        </div>
                    )}
                    {props.children}
                </div>
            </Show>
        </Portal>
    );
}

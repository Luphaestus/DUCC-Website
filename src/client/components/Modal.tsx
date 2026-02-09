import { JSX, createEffect, createSignal, onCleanup, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { CLOSE_SVG } from "@/utils/icons";
import { incrementModals, decrementModals } from "@/utils/modal-state";

interface ModalProps {
    title?: string;
    children: JSX.Element;
    isOpen: boolean;
    onClose: () => void;
    footer?: JSX.Element;
    maxWidth?: string;
}

export default function Modal(props: ModalProps) {
    const [isVisible, setIsVisible] = createSignal(false);
    const [isRendered, setIsRendered] = createSignal(false);

    createEffect(() => {
        if (props.isOpen) {
            setIsRendered(true);
            incrementModals();
            
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 10);
            
            onCleanup(() => {
                decrementModals();
                clearTimeout(timer);
            });
        }
    });

    createEffect(() => {
        if (!props.isOpen) {
            setIsVisible(false);
            const timer = setTimeout(() => {
                setIsRendered(false);
            }, 300);
            onCleanup(() => clearTimeout(timer));
        }
    });

    const handleClose = (e?: MouseEvent) => {
        if (e) e.stopPropagation();
        props.onClose();
    };

    return (
        <Portal>
            <Show when={isRendered()}>
                <div 
                    class="c-modal-overlay" 
                    classList={{ 
                        'modal-display': true,
                        'visible': isVisible() 
                    }}
                    onClick={() => handleClose()}
                >
                    <div 
                        class="liquid-container c-modal-content" 
                        style={{
                            '--liquid-border-radius': '28px',
                            ...(props.maxWidth ? { "max-width": props.maxWidth } : {}),
                            padding: 'var(--pico-spacing)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            class="c-modal-close-btn" 
                            onClick={() => handleClose()}
                            innerHTML={CLOSE_SVG}
                        />
                        
                        {props.title && (
                            <div class="c-modal-header">
                                <h2>{props.title}</h2>
                            </div>
                        )}

                        <div class="c-modal-body">
                            {props.children}
                        </div>

                        {props.footer && (
                            <div class="modal-actions">
                                {props.footer}
                            </div>
                        )}
                    </div>
                </div>
            </Show>
        </Portal>
    );
}

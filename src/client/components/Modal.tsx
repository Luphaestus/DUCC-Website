import { JSX, createEffect, createSignal, onCleanup } from "solid-js";
import { CLOSE_SVG } from "@/utils/icons";
import { incrementModals, decrementModals } from "@/utils/modal-state";
import LiquidContainer from "./LiquidContainer";

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
            // Small delay to allow CSS transitions
            setTimeout(() => {
                setIsVisible(true);
            }, 10);
        } else {
            setIsVisible(false);
            // Wait for transition to finish before unrendering
            const timer = setTimeout(() => {
                if (!props.isOpen) {
                    setIsRendered(false);
                    if (isVisible()) decrementModals();
                }
            }, 300);
            onCleanup(() => clearTimeout(timer));
        }
    });

    onCleanup(() => {
        if (props.isOpen) {
            decrementModals();
        }
    });

    const handleClose = (e?: MouseEvent) => {
        if (e) e.stopPropagation();
        props.onClose();
    };

    return (
        <div 
            class="c-modal-overlay" classList={{ 'modal-display': isRendered(), 'modal-hidden': !isRendered() }}
            classList={{ visible: isVisible() }}
            onClick={() => handleClose()}
        >
            <LiquidContainer 
                class="c-modal-content" 
                style={{
                    background: 'transparent',
                    border: 'none',
                    'box-shadow': 'none',
                    ...(props.maxWidth ? { "max-width": props.maxWidth } : {})
                }}
                borderRadius={28}
                tintOpacity={0.2}
            >
                <div 
                    onClick={(e) => e.stopPropagation()}
                    style={{ padding: 'var(--pico-spacing)' }}
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
            </LiquidContainer>
        </div>
    );
}

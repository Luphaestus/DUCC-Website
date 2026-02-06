import { ParentProps, splitProps, JSX, mergeProps } from "solid-js";
import LiquidContainer from "./LiquidContainer";

interface LiquidButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
    borderRadius?: number;
    tintOpacity?: number;
    type?: 'rounded' | 'circle' | 'pill';
    size?: number; 
    warp?: boolean;
    htmlType?: 'submit' | 'button' | 'reset';
    displacementScale?: number;
    blurAmount?: number;
    saturation?: number;
    aberrationIntensity?: number;
    elasticity?: number;
    padding?: string;
}

export default function LiquidButton(props: LiquidButtonProps) {
    const [local, others] = splitProps(props, [
        "children", "class", "style", "borderRadius", "tintOpacity", 
        "type", "size", "warp", "onClick", "htmlType", "padding",
        "displacementScale", "blurAmount", "saturation", "aberrationIntensity", "elasticity"
    ]);
    
    const containerProps = {
        borderRadius: local.borderRadius ?? (local.size ? local.size : 20),
        tintOpacity: local.tintOpacity ?? 0.2,
        type: local.type || 'rounded',
        elasticity: props.elasticity ?? 0.25, 
        displacementScale: props.displacementScale,
        blurAmount: props.blurAmount,
        saturation: props.saturation,
        aberrationIntensity: props.aberrationIntensity,
        padding: local.padding || '0.6rem 1.25rem',
        class: `liquid-button-wrapper ${local.class || ''}`,
        onClick: (e: MouseEvent) => local.onClick?.(e as any),
        style: {
            cursor: 'pointer',
            display: 'inline-flex',
            'align-items': 'center',
            'justify-content': 'center',
            border: 'none',
            ...local.style
        }
    };

    return (
        <LiquidContainer {...containerProps}>
            <button 
                type={local.htmlType || 'button'}
                style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    font: 'inherit',
                    color: 'inherit',
                    cursor: 'pointer',
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                    gap: '0.5rem',
                    width: '100%',
                    height: '100%',
                    'font-weight': 500
                }}
                {...others}
            >
                {local.children}
            </button>
        </LiquidContainer>
    );
}

// --- Standardized Variants ---

export function GlassButtonLarge(props: LiquidButtonProps) {
    const merged = mergeProps({
        padding: '1rem 2rem',
        borderRadius: 24,
        style: { 'font-size': '1.1rem', 'font-weight': 600 }
    }, props);
    return <LiquidButton {...merged} />;
}

export function GlassButtonSmall(props: LiquidButtonProps) {
    const merged = mergeProps({
        padding: '0.4rem 0.8rem',
        borderRadius: 12,
        style: { 'font-size': '0.85rem' }
    }, props);
    return <LiquidButton {...merged} />;
}

import { ParentProps, splitProps, JSX, mergeProps } from "solid-js";

interface LiquidButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
    borderRadius?: number;
    tintOpacity?: number;
    variant?: 'rounded' | 'circle' | 'pill';
    size?: number; 
    warp?: boolean;
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
        "variant", "size", "warp", "onClick", "padding",
        "displacementScale", "blurAmount", "saturation", "aberrationIntensity", "elasticity"
    ]);
    
    // Check if disabled is in others (it's a standard HTML attribute)
    const isDisabled = () => (others as any).disabled;

    const containerProps = {
        borderRadius: local.borderRadius ?? (local.size ? local.size : 20),
        tintOpacity: local.tintOpacity ?? 0.2,
        variant: local.variant || 'rounded',
        elasticity: local.elasticity ?? 0.25, 
        displacementScale: local.displacementScale,
        blurAmount: local.blurAmount,
        saturation: local.saturation,
        aberrationIntensity: local.aberrationIntensity,
        padding: local.padding || '0.6rem 1.25rem',
        class: `liquid-button-wrapper ${local.class || ''}`,
        onClick: (e: MouseEvent) => {
            if (isDisabled()) return;
            (local.onClick as any)?.(e);
        },
        style: mergeProps({
            cursor: isDisabled() ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            'align-items': 'center',
            'justify-content': 'center',
            border: 'none'
        }, typeof local.style === 'object' ? local.style : {}) as JSX.CSSProperties
    };

    return (
        <div 
            class={`liquid-container ${containerProps.class}`}
            style={mergeProps({
                '--liquid-border-radius': `${containerProps.borderRadius}px`,
                '--liquid-padding': containerProps.padding,
                '--liquid-blur': containerProps.blurAmount !== undefined ? `${containerProps.blurAmount * 40}px` : undefined,
                '--liquid-saturation': containerProps.saturation !== undefined ? `${containerProps.saturation}%` : undefined,
            }, containerProps.style) as any}
            onClick={containerProps.onClick}
        >
            <button 
                type={others.type || 'button'}
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
        </div>
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

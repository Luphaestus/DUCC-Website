import { mergeProps, ParentProps, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';

// Context stub
export function useLiquidContainer() {
    return null;
}

interface LiquidProps extends ParentProps {
  as?: string;
  class?: string;
  classList?: { [k: string]: boolean | undefined };
  style?: any; 
  borderRadius?: number;
  tintOpacity?: number;
  blurAmount?: number;
  saturation?: number;
  noBlur?: boolean;
  padding?: string;
  [key: string]: any; 
}

export default function LiquidContainer(props: LiquidProps) {
  const [local, others] = splitProps(props, [
    'as', 'class', 'style', 'borderRadius', 'padding', 'children', 
    'blurAmount', 'saturation', 'noBlur', 'tintOpacity'
  ]);

  const merged = mergeProps({
    as: 'div',
    class: '',
    style: {},
    borderRadius: 20,
    padding: '0px',
    blurAmount: 0.125, // Match footer (20px)
    saturation: 180,   // Match footer (180%)
    noBlur: false,
    tintOpacity: 0.05
  }, local);

  const effectiveBlurPx = () => merged.blurAmount * 160;

  return (
    <Dynamic
      component={merged.as}
      class={`liquid-container ${merged.class}`}
      classList={props.classList}
      {...others}
      style={{
        position: 'relative',
        'border-radius': `${merged.borderRadius}px`,
        'padding': merged.padding,
        'background-color': 'var(--glass-bg)',
        'backdrop-filter': !merged.noBlur ? `blur(${effectiveBlurPx()}px) saturate(${merged.saturation}%)` : 'none',
        '-webkit-backdrop-filter': !merged.noBlur ? `blur(${effectiveBlurPx()}px) saturate(${merged.saturation}%)` : 'none',
        ...merged.style
      }}
    >
        <div class="liquid-content" style={{ 
            position: 'relative', 
            'z-index': 1,
            display: 'flex',
            'flex-direction': 'inherit',
            'align-items': 'inherit',
            'justify-content': 'inherit',
            'gap': 'inherit',
            width: '100%',
            height: '100%'
        }}>
            {merged.children}
        </div>
    </Dynamic>
  );
}
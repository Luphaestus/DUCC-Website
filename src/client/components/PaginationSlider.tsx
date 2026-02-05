import { createSignal, createEffect, JSX, Show, onCleanup } from "solid-js";

interface PaginationSliderProps {
    currentPage: number;
    children: JSX.Element;
    oldContent: JSX.Element | null;
}

export default function PaginationSlider(props: JSX.HTMLAttributes<HTMLDivElement> & PaginationSliderProps) {
    const [slideDirection, setSlideDirection] = createSignal<'left' | 'right' | ''>('');
    const [isAnimating, setIsAnimating] = createSignal(false);
    const [cachedOldContent, setCachedOldContent] = createSignal<JSX.Element | null>(null);
    const [height, setHeight] = createSignal<string>('auto');
    
    let containerRef: HTMLDivElement | undefined;
    let trackRef: HTMLDivElement | undefined;
    let lastPage = props.currentPage;

    createEffect(() => {
        const current = props.currentPage;
        if (current !== lastPage) {
            if (containerRef) {
                // Capture current height before we do anything
                const currentHeight = containerRef.offsetHeight;
                setHeight(`${currentHeight}px`);
                // Force a reflow so the browser recognizes the fixed height before we change it
                void containerRef.offsetHeight;
            }

            setCachedOldContent(props.oldContent);
            setSlideDirection(current > lastPage ? 'right' : 'left');
            setIsAnimating(true);
            
            // Wait for the new content to be rendered in the track to measure it
            // We use requestAnimationFrame to ensure the DOM has updated with the new items
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (containerRef && trackRef && isAnimating()) {
                        const items = trackRef.querySelectorAll('.slider-item');
                        let newHeight = 0;
                        if (slideDirection() === 'right') {
                            // [Old, New] -> New is second
                            newHeight = (items[1] as HTMLElement)?.offsetHeight || 0;
                        } else {
                            // [New, Old] -> New is first
                            newHeight = (items[0] as HTMLElement)?.offsetHeight || 0;
                        }
                        
                        if (newHeight > 0) {
                            setHeight(`${newHeight}px`);
                        }
                    }
                });
            });

            const timer = setTimeout(() => {
                setIsAnimating(false);
                setSlideDirection('');
                setCachedOldContent(null);
                
                // Keep the fixed height for a tiny bit longer to ensure animation is 100% done
                setTimeout(() => {
                    if (!isAnimating()) {
                        setHeight('auto');
                    }
                }, 50);
            }, 500);
            
            lastPage = current;
            onCleanup(() => clearTimeout(timer));
        }
    });

    return (
        <div 
            ref={containerRef}
            class="slider-container" 
            style={{ 
                height: height(), 
                transition: height() === 'auto' ? 'none' : 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)' 
            }}
        >
            <div 
                ref={trackRef}
                class="slider-track" 
                classList={{ 
                    'animate-to-left': slideDirection() === 'right', 
                    'animate-to-right': slideDirection() === 'left',
                    'is-animating': isAnimating()
                }}
            >
                {/* For moving LEFT (Prev): we want [New, Old] and slide -100% -> 0 */}
                <Show when={isAnimating() && slideDirection() === 'left'}>
                    <div class="slider-item">
                        {props.children}
                    </div>
                </Show>

                {/* Normal / Main item */}
                <div class="slider-item">
                    {isAnimating() && slideDirection() === 'right' ? cachedOldContent() : props.children}
                </div>

                {/* For moving RIGHT (Next): we want [Old, New] and slide 0 -> -100% */}
                <Show when={isAnimating() && slideDirection() === 'right'}>
                    <div class="slider-item">
                        {props.children}
                    </div>
                </Show>

                {/* For moving LEFT (Prev): the Old item at the end */}
                <Show when={isAnimating() && slideDirection() === 'left'}>
                    <div class="slider-item">
                        {cachedOldContent()}
                    </div>
                </Show>
            </div>
        </div>
    );
}

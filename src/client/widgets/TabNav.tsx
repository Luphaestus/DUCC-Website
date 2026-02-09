import { createEffect, onMount, onCleanup, ParentProps, splitProps, createMemo, Show } from "solid-js";

interface TabNavProps extends ParentProps {
    class?: string;
    id?: string;
}

export function TabNav(props: TabNavProps) {
    let navRef: HTMLElement | undefined;
    let bgRef: HTMLDivElement | undefined;

    const updatePosition = () => {
        if (!navRef || !bgRef) return;
        const active = navRef.querySelector('.active') as HTMLElement;
        
        if (active) {
            const width = active.offsetWidth;
            const height = active.offsetHeight;
            const left = active.offsetLeft;
            const top = active.offsetTop;

            bgRef.style.setProperty('--tab-width', `${width}px`);
            bgRef.style.setProperty('--tab-height', `${height}px`);
            bgRef.style.setProperty('--tab-left', `${left}px`);
            bgRef.style.setProperty('--tab-top', `${top}px`);
            bgRef.style.opacity = '1';
        } else {
            bgRef.style.opacity = '0';
        }
    };

    onMount(() => {
        // Wait for fonts/layout
        const timer = setTimeout(updatePosition, 100);

        window.addEventListener('resize', updatePosition);
        
        // Use MutationObserver to detect class changes (active) on buttons
        const observer = new MutationObserver(() => {
            updatePosition();
        });
        
        if (navRef) {
            observer.observe(navRef, { 
                attributes: true, 
                subtree: true, 
                attributeFilter: ['class'],
                childList: true 
            });
        }
        
        onCleanup(() => {
            clearTimeout(timer);
            window.removeEventListener('resize', updatePosition);
            observer.disconnect();
        });
    });

    createEffect(() => {
        // Trigger on children change
        const c = props.children;
        // Also trigger on a slight delay to allow solid to render
        setTimeout(updatePosition, 0);
    });

    const hasChildren = createMemo(() => {
        const c = props.children;
        if (!c) return false;
        if (Array.isArray(c) && c.length === 0) return false;
        return true;
    });

    return (
        <Show when={hasChildren()}>
            <nav 
                ref={navRef} 
                class={`liquid-container toggle-group ${props.class || ''}`} 
                id={props.id} 
            >
                <div ref={bgRef} class="toggle-bg"></div>
                {props.children}
            </nav>
        </Show>
    );
}

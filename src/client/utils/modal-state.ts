/**
 * modal-state.ts
 * 
 * Manages the global state for open modals, such as the count and body classes.
 * This is separated from the Modal class to avoid circular dependencies with the router.
 */

let openModalsCount = 0;

export function incrementModals() {
    openModalsCount++;
    document.body.classList.add('modal-open');
}

export function decrementModals() {
    openModalsCount = Math.max(0, openModalsCount - 1);
    if (openModalsCount === 0) {
        document.body.classList.remove('modal-open');
    }
}

export function getOpenModalsCount() {
    return openModalsCount;
}

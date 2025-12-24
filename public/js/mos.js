/**
 * mos.js
 * MotionOnScroll (MOS) Animation Library.
 * 
 * This library triggers CSS animations when elements enter the viewport.
 * It uses IntersectionObserver for efficient scroll detection and 
 * MutationObserver to automatically support dynamically loaded content (SPA views).
 */

(function () {
    // --- Intersection Observer Configuration ---

    /**
     * Observer that watches for elements entering the viewport.
     * When an element with 'data-mos' is seen, it applies animation delays/durations
     * and adds the 'mos-active' class to trigger CSS transitions.
     */
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const delay = el.getAttribute("data-mos-delay");
                const duration = el.getAttribute("data-mos-duration");

                // Apply custom timing if specified via data attributes
                if (delay) el.style.setProperty("--mos-delay", `${delay}ms`);
                if (duration) el.style.setProperty("--mos-duration", `${duration}ms`);

                // Trigger the animation by adding the active class
                el.classList.add("mos-active");
                
                // Stop observing once the animation has been triggered (animate once)
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.2 }); // Trigger when 20% of the element is visible

    // --- Helper Functions ---

    /**
     * Finds elements with the 'data-mos' attribute that haven't been observed yet.
     * @param {HTMLElement|Document} container - The container to search within.
     */
    function observeElements(container = document) {
        const elements = container.querySelectorAll("[data-mos]:not(.mos-observed)");
        elements.forEach(el => {
            el.classList.add("mos-observed");
            observer.observe(el);
        });
    }

    // --- Initialization & Dynamic Content Support ---

    document.addEventListener("DOMContentLoaded", () => {
        // Initial scan for static content
        observeElements();

        // Target the main container where SPA views are injected
        const targetNode = document.querySelector('main') || document.body;
        
        let timeout;
        /**
         * Watch for DOM changes (injected views).
         * When new content is added, re-scan for 'data-mos' elements.
         */
        const mutationObserver = new MutationObserver(() => {
            // Debounce processing to handle bulk DOM changes (e.g., view injection) efficiently
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                observeElements(targetNode);
            }, 50);
        });

        mutationObserver.observe(targetNode, {
            childList: true,
            subtree: true
        });
    });
})();
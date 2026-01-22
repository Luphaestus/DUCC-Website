/**
 * mos.js
 * 
 * "MotionOnScroll" (MOS) Animation Library.
 * Triggers CSS animations on elements when they enter the viewport using IntersectionObserver.
 * Supports dynamic content by watching for DOM mutations.
 */

(function () {
    /**
     * The observer instance that tracks viewport intersections.
     * Triggers animations by adding the 'mos-active' class.
     */
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const delay = el.getAttribute("data-mos-delay");
                const duration = el.getAttribute("data-mos-duration");

                // Apply custom timing from attributes if present
                if (delay) el.style.setProperty("--mos-delay", `${delay}ms`);
                if (duration) el.style.setProperty("--mos-duration", `${duration}ms`);

                el.classList.add("mos-active");
                // Stop observing once animated to prevent re-triggering
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.2 });

    /**
     * Scans the provided container for elements with the [data-mos] attribute
     * and adds them to the observer.
     * 
     * @param {HTMLElement|Document} [container=document] - The element to scan.
     */
    function observeElements(container = document) {
        const elements = container.querySelectorAll("[data-mos]:not(.mos-observed)");
        elements.forEach(el => {
            el.classList.add("mos-observed");
            observer.observe(el);
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        // Initial scan of the page
        observeElements();

        const targetNode = document.querySelector('main') || document.body;
        let timeout;

        /**
         * Watch for DOM changes to support dynamic content (SPA view switches).
         * Uses a small debounce to minimize performance impact.
         */
        const mutationObserver = new MutationObserver(() => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                observeElements(targetNode);
            }, 50);
        });

        mutationObserver.observe(targetNode, { childList: true, subtree: true });
    });
})();
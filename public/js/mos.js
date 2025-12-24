/**
 * mos.js
 * MotionOnScroll (MOS) Animation Library
 * Author: hellogirish07 (Girish) | https://github.com/hellogirish07/MOS-MotionOnScroll
 * Version: 1.0.0
 * Handles scroll-triggered animations with support for dynamic content.
 */

(function () {
    // --- Intersection Observer ---

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const delay = el.getAttribute("data-mos-delay");
                const duration = el.getAttribute("data-mos-duration");

                // Apply custom timing if specified
                if (delay) el.style.setProperty("--mos-delay", `${delay}ms`);
                if (duration) el.style.setProperty("--mos-duration", `${duration}ms`);

                el.classList.add("mos-active");
                observer.unobserve(el); // Animate only once
            }
        });
    }, { threshold: 0.2 });

    // --- Helper Functions ---

    /**
     * Finds and observes new elements with the data-mos attribute.
     * @param {HTMLElement|Document} container 
     */
    function observeElements(container = document) {
        const elements = container.querySelectorAll("[data-mos]:not(.mos-observed)");
        elements.forEach(el => {
            el.classList.add("mos-observed");
            observer.observe(el);
        });
    }

    // --- Initialization & Dynamic Content ---

    document.addEventListener("DOMContentLoaded", () => {
        observeElements();

        // Target the main container specifically to reduce observer overhead
        const targetNode = document.querySelector('main') || document.body;
        
        let timeout;
        const mutationObserver = new MutationObserver(() => {
            // Debounce processing to handle bulk DOM changes efficiently
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
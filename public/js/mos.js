/**
 * Triggers CSS animations when elements enter the viewport.
 */

(function () {
    /**
     * Observes elements entering the viewport.
     */
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const delay = el.getAttribute("data-mos-delay");
                const duration = el.getAttribute("data-mos-duration");

                if (delay) el.style.setProperty("--mos-delay", `${delay}ms`);
                if (duration) el.style.setProperty("--mos-duration", `${duration}ms`);

                el.classList.add("mos-active");
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.2 });

    /**
     * Find and observe new data-mos elements.
     * @param {HTMLElement|Document} container
     */
    function observeElements(container = document) {
        const elements = container.querySelectorAll("[data-mos]:not(.mos-observed)");
        elements.forEach(el => {
            el.classList.add("mos-observed");
            observer.observe(el);
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        observeElements();

        const targetNode = document.querySelector('main') || document.body;
        let timeout;

        /**
         * Watch for DOM changes to support dynamic content.
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
export function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { 
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    const observe = () => {
        document.querySelectorAll('.scroll-reveal:not(.visible)').forEach(el => observer.observe(el));
    };

    // Initial run
    observe();

    // Re-run when navigation or data changes might have added new elements
    const mutationObserver = new MutationObserver(observe);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
        observer.disconnect();
        mutationObserver.disconnect();
    };
}

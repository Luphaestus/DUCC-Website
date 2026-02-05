const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target as HTMLElement;
      const delay = el.getAttribute("data-mos-delay");
      const duration = el.getAttribute("data-mos-duration");

      if (delay) el.style.setProperty("--mos-delay", `${delay}ms`);
      if (duration) el.style.setProperty("--mos-duration", `${duration}ms`);

      el.classList.add("mos-active");
      observer.unobserve(el);
    }
  });
}, { threshold: 0.2 });

export function mos(el: HTMLElement) {
  observer.observe(el);
}

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      mos: boolean;
    }
  }
}

/* 🌟 MotionOnScroll (MOS)
   Smooth, modern scroll animations — reimagined.
   Author: GK | Version: 1.0.0
*/

// Taken from https://motion-on-scroll.netlify.app/mos.js Downloaded as I did not want to rely on an external CDN. (Why should I have to? And why is that the recommended way to use it??)

document.addEventListener("DOMContentLoaded", () => {
    const elements = document.querySelectorAll("[data-mos]");
  
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
  
    elements.forEach(el => observer.observe(el));
  });
  

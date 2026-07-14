/* ------------------------------------------------------------------ *
 *  UI interactions: scroll reveals, animated counters, nav state,
 *  scroll progress bar, and pointer-tracking card tilt/glow.
 * ------------------------------------------------------------------ */
(function () {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- Scroll reveal --- */
  const revealEls = document.querySelectorAll(".reveal");
  if (reduced) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* --- Animated counters --- */
  const counters = document.querySelectorAll(".stat__num");
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.target || "0");
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const dur = 1400;
    let start = null;
    const step = (ts) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.round(eased * target);
      el.textContent = prefix + val + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (reduced) {
    counters.forEach((el) => {
      el.textContent =
        (el.dataset.prefix || "") + (el.dataset.target || "") + (el.dataset.suffix || "");
    });
  } else {
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            cio.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((el) => cio.observe(el));
  }

  /* --- Nav scrolled state + scroll progress --- */
  const nav = document.getElementById("nav");
  const progress = document.getElementById("scrollProgress");
  const onScroll = () => {
    const y = window.scrollY;
    if (nav) nav.classList.toggle("is-scrolled", y > 40);
    if (progress) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* --- Card tilt + glow following the pointer --- */
  if (!reduced && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      const strength = 8;
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const rx = (0.5 - py) * strength;
        const ry = (px - 0.5) * strength;
        card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
        card.style.setProperty("--mx", px * 100 + "%");
        card.style.setProperty("--my", py * 100 + "%");
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  }

  /* --- Active nav link highlight --- */
  const sections = document.querySelectorAll("section[id], header[id]");
  const navLinks = document.querySelectorAll(".nav__links a");
  const linkFor = (id) =>
    Array.from(navLinks).find((a) => a.getAttribute("href") === "#" + id);
  if ("IntersectionObserver" in window) {
    const sio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((a) => a.classList.remove("is-active"));
            const link = linkFor(entry.target.id);
            if (link) link.classList.add("is-active");
          }
        });
      },
      { threshold: 0.5 }
    );
    sections.forEach((s) => sio.observe(s));
  }
})();

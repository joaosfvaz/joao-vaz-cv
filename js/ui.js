/* ------------------------------------------------------------------ *
 *  UI interactions — scroll reveals, animated counters, nav state,
 *  the scroll-told timeline, and pointer-tracking card tilt/glow.
 *
 *  All scroll-driven motion reads from window.Scroll (js/scroll.js).
 * ------------------------------------------------------------------ */
(function () {
  "use strict";

  const S = window.Scroll;
  const reduced = S.reduced;
  const clamp = S.clamp;
  const lerp = S.lerp;

  /* ------------------------------------------------------------------
   * Staggered scroll reveal
   * Siblings inside one group each get an index, so a group arrives as
   * a run of beats instead of one block.
   * ---------------------------------------------------------------- */
  const revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  /* index each element among its revealing siblings */
  const groups = new Map();
  revealEls.forEach((el) => {
    const parent = el.parentElement;
    const n = groups.get(parent) || 0;
    groups.set(parent, n + 1);
    el.style.setProperty("--i", String(Math.min(n, 6)));
  });

  /* transform must be cleared once a reveal finishes: a lingering
     transform would become the containing block for sticky children. */
  const settle = (el) => el.classList.add("is-done");

  if (reduced) {
    revealEls.forEach((el) => {
      el.classList.add("is-visible");
      settle(el);
    });
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          /* above the viewport — the reader jumped past it. Show it at
             once rather than animating content they already scrolled by. */
          if (!entry.isIntersecting) {
            if (entry.boundingClientRect.bottom >= 0) return;
            io.unobserve(el);
            el.classList.add("is-visible");
            settle(el);
            return;
          }
          io.unobserve(el);
          el.classList.add("is-visible");
          const delay = 900 + parseInt(el.style.getPropertyValue("--i") || "0", 10) * 80;
          setTimeout(() => settle(el), delay);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------
   * Animated counters — one shot, never scrubbed
   * ---------------------------------------------------------------- */
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
      const val = Math.round(S.easeOutCubic(p) * target);
      el.textContent = prefix + val + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const finalValue = (el) =>
    (el.dataset.prefix || "") + (el.dataset.target || "") + (el.dataset.suffix || "");

  if (reduced) {
    counters.forEach((el) => (el.textContent = finalValue(el)));
  } else {
    /* Driven by the scroll driver, not by IntersectionObserver: an
       anchor jump can move a stat from below the viewport to above it
       without ever crossing a visibility threshold, which used to leave
       the number sitting at zero for good. */
    let marks = [];
    S.onMeasure(() => {
      /* a re-measure must not replay a counter that already ran */
      const ran = new Map(marks.map((m) => [m.el, m.done]));
      marks = Array.prototype.slice.call(counters).map((el) => {
        const r = el.getBoundingClientRect();
        return { el: el, top: r.top + window.scrollY, done: ran.get(el) === true };
      });
    });
    S.onScroll((st) => {
      for (let i = 0; i < marks.length; i++) {
        const m = marks[i];
        if (m.done) continue;
        if (m.top < st.y) {
          /* scrolled clean past it */
          m.done = true;
          m.el.textContent = finalValue(m.el);
        } else if (m.top < st.y + st.vh * 0.88) {
          m.done = true;
          animateCount(m.el);
        }
      }
    });
  }

  /* ------------------------------------------------------------------
   * Nav state + scroll progress (cheap, runs on scroll events)
   * ---------------------------------------------------------------- */
  const nav = document.getElementById("nav");
  const progress = document.getElementById("scrollProgress");
  S.onScroll((st) => {
    if (nav) nav.classList.toggle("is-scrolled", st.y > 40);
    if (progress) progress.style.transform = "scaleX(" + st.progress + ")";
  });

  /* ------------------------------------------------------------------
   * Smooth anchor navigation
   * The global CSS `scroll-behavior: smooth` was removed: it desynced
   * every scroll-driven effect from the input. Anchors smooth here.
   * ---------------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href").slice(1);
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", "#" + id);
    });
  });

  /* ------------------------------------------------------------------
   * Hero — the copy lifts away and dims as the first section leaves
   * ---------------------------------------------------------------- */
  const heroInner = document.querySelector(".hero__inner");
  const heroScroll = document.querySelector(".hero__scroll");
  if (heroInner && !reduced) {
    S.onFrame(() => {
      const p = clamp(S.state.y / (S.state.vh * 0.9), 0, 1);
      const e = S.smoothstep(p);
      heroInner.style.transform = "translate3d(0," + (e * -70).toFixed(2) + "px,0)";
      heroInner.style.opacity = (1 - e * 1.05).toFixed(3);
      if (heroScroll) heroScroll.style.opacity = (1 - p * 2.6).toFixed(3);
    });
  }

  /* ------------------------------------------------------------------
   * Readability veil
   * The crystal owns the hero and the contact. In between it has to sit
   * behind the copy, so the veil rises once the hero leaves and eases
   * back down as the contact section arrives.
   * ---------------------------------------------------------------- */
  const veil = document.querySelector(".veil");
  if (veil && !reduced) {
    let lastV = -1;
    S.onFrame((st) => {
      const outOfHero = S.smoothstep(clamp(st.y / (st.vh * 0.85), 0, 1));
      const intoContact = S.smoothstep(S.enterProgress("contact"));
      const v = outOfHero * 0.62 * (1 - intoContact * 0.85);
      if (Math.abs(v - lastV) > 0.004) {
        veil.style.opacity = v.toFixed(3);
        lastV = v;
      }
    });
  }

  /* ------------------------------------------------------------------
   * Experience — the scroll-told spine
   * The timeline line draws itself as you read, the meta column sticks
   * beside its entry, and the role under the reading line lights up.
   * ---------------------------------------------------------------- */
  const timeline = document.querySelector(".timeline");
  const items = Array.prototype.slice.call(document.querySelectorAll(".tl"));
  if (timeline && items.length) {
    if (reduced) {
      timeline.style.setProperty("--tl-fill", "1");
      items.forEach((li) => li.classList.add("is-active"));
    } else {
      /* absolute document positions, re-read only when layout changes */
      let tops = [];
      let startY = 0;
      let endY = 1;
      S.onMeasure(() => {
        tops = items.map((li) => li.getBoundingClientRect().top + window.scrollY);
        const last = items[items.length - 1];
        startY = tops[0];
        endY = tops[tops.length - 1] + last.getBoundingClientRect().height * 0.55;
      });

      let lastActive = -2;
      let lastFill = -1;
      S.onFrame((st) => {
        if (!tops.length) return;
        const readLine = st.y + st.vh * 0.45;

        const fill = clamp((readLine - startY) / Math.max(1, endY - startY), 0, 1);
        if (Math.abs(fill - lastFill) > 0.002) {
          timeline.style.setProperty("--tl-fill", fill.toFixed(4));
          lastFill = fill;
        }

        /* the entry the reading line currently sits inside */
        let active = -1;
        for (let i = 0; i < tops.length; i++) {
          if (readLine >= tops[i]) active = i;
        }
        if (active !== lastActive) {
          items.forEach((li, i) => li.classList.toggle("is-active", i <= active));
          lastActive = active;
        }
      });
    }
  }

  /* ------------------------------------------------------------------
   * Card tilt + glow following the pointer
   * ---------------------------------------------------------------- */
  if (!reduced && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      const strength = 8;
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const rx = (0.5 - py) * strength;
        const ry = (px - 0.5) * strength;
        card.style.transform =
          "perspective(800px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) translateY(-4px)";
        card.style.setProperty("--mx", px * 100 + "%");
        card.style.setProperty("--my", py * 100 + "%");
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  }

  /* ------------------------------------------------------------------
   * Active nav link highlight
   * ---------------------------------------------------------------- */
  const sections = document.querySelectorAll("section[id], header[id]");
  const navLinks = document.querySelectorAll(".nav__links a");
  const linkFor = (id) =>
    Array.prototype.slice.call(navLinks).find((a) => a.getAttribute("href") === "#" + id);
  const sio = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.classList.remove("is-active"));
        const link = linkFor(entry.target.id);
        if (link) link.classList.add("is-active");
      });
    },
    { threshold: 0.5 }
  );
  sections.forEach((s) => sio.observe(s));

  /* remeasure once fonts land — metrics shift when they swap in */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => S.measure());
  }
})();

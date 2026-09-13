/* ------------------------------------------------------------------ *
 *  Project carousel — the 3D sideways track in the Building section.
 *
 *  The track is a native scroller with centre snapping, so a trackpad,
 *  shift-wheel, a swipe or the keyboard all move it the same way. This
 *  file only reads where each slide sits: on every scroll frame it
 *  writes --d (signed distance from the centre, in slides) and --f
 *  (focus, 1 at the centre fading to 0 one slide away) and styles.css
 *  turns those into the tilt, depth and magnification. It also adds
 *  the arrows, the dots, and "click a side project to bring it in".
 *  Vertical wheel scrolling is never taken over.
 * ------------------------------------------------------------------ */
(function () {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll("[data-carousel]").forEach((root) => {
    const track = root.querySelector(".carousel__track");
    const slides = Array.prototype.slice.call(track.querySelectorAll(".carousel__slide"));
    const prev = root.querySelector('[data-dir="-1"]');
    const next = root.querySelector('[data-dir="1"]');
    const dotsBox = root.querySelector(".carousel__dots");
    if (!slides.length) return;

    /* the cards land left to right, one beat apart, instead of all at
       once (ui.js indexes reveals per parent, and each slide has one) */
    slides.forEach((slide, i) => {
      const card = slide.firstElementChild;
      if (card) card.style.setProperty("--i", String(i));
    });

    const dots = slides.map(() => dotsBox.appendChild(document.createElement("i")));

    let active = -1;
    let queued = false;

    function slideCentre(slide) {
      return slide.offsetLeft + slide.offsetWidth / 2;
    }

    function update() {
      queued = false;
      const centre = track.scrollLeft + track.clientWidth / 2;
      let nearest = 0;
      let best = Infinity;
      slides.forEach((slide, i) => {
        const raw = (slideCentre(slide) - centre) / slide.offsetWidth;
        const d = Math.max(-2, Math.min(2, raw));
        const f = Math.max(0, 1 - Math.abs(d));
        slide.style.setProperty("--d", d.toFixed(3));
        slide.style.setProperty("--f", f.toFixed(3));
        if (Math.abs(raw) < best) {
          best = Math.abs(raw);
          nearest = i;
        }
      });
      if (nearest !== active) {
        if (active > -1) {
          slides[active].classList.remove("is-active");
          dots[active].classList.remove("is-on");
        }
        active = nearest;
        slides[active].classList.add("is-active");
        dots[active].classList.add("is-on");
        prev.disabled = active === 0;
        next.disabled = active === slides.length - 1;
      }
    }

    function queue() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    }

    function goTo(i, instant) {
      const n = Math.max(0, Math.min(slides.length - 1, i));
      const left = slideCentre(slides[n]) - track.clientWidth / 2;
      track.scrollTo({ left: left, behavior: instant || reduced ? "auto" : "smooth" });
    }

    track.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", () => {
      goTo(active, true);
      queue();
    });

    prev.addEventListener("click", () => goTo(active - 1));
    next.addEventListener("click", () => goTo(active + 1));

    /* a side project is brought to the centre first; only the magnified
       one follows its link */
    slides.forEach((slide, i) => {
      slide.addEventListener("click", (ev) => {
        if (i === active) return;
        ev.preventDefault();
        goTo(i);
      });
      /* tabbing onto a card centres it, so focus is never off to the side */
      slide.addEventListener("focusin", () => {
        if (i !== active) goTo(i);
      });
    });

    /* the arrow keys step a whole project, not the browser's 40px */
    track.addEventListener("keydown", (ev) => {
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
      ev.preventDefault();
      goTo(active + (ev.key === "ArrowRight" ? 1 : -1));
    });

    /* open on the slide marked data-start, with a neighbour either side */
    const start = slides.findIndex((s) => s.hasAttribute("data-start"));
    goTo(start > -1 ? start : 0, true);
    update();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        goTo(active, true);
        update();
      });
    }
  });
})();

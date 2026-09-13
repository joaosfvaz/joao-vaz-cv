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
 *
 *  It loops: the projects are copied once before and once after the
 *  originals, and whenever the track comes to rest on a copy it jumps,
 *  instantly, by exactly one set's width to the same project among the
 *  originals. Every slide's look is a function of its distance from the
 *  centre alone, so the jump draws the same frame and cannot be seen.
 * ------------------------------------------------------------------ */
(function () {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll("[data-carousel]").forEach((root) => {
    const track = root.querySelector(".carousel__track");
    const originals = Array.prototype.slice.call(track.querySelectorAll(".carousel__slide"));
    const prev = root.querySelector('[data-dir="-1"]');
    const next = root.querySelector('[data-dir="1"]');
    const dotsBox = root.querySelector(".carousel__dots");
    const n = originals.length;
    if (!n) return;

    /* the cards land left to right, one beat apart, instead of all at
       once (ui.js indexes reveals per parent, and each slide has one) */
    originals.forEach((slide, i) => {
      const card = slide.firstElementChild;
      if (card) card.style.setProperty("--i", String(i));
    });

    /* the copies are for the eye only: hidden from assistive tech, out
       of the tab order, and shown settled (ui.js has already collected
       the reveals, so a copied .reveal would stay invisible) */
    function copy(slide) {
      const c = slide.cloneNode(true);
      c.removeAttribute("data-start");
      c.setAttribute("aria-hidden", "true");
      c.querySelectorAll(".reveal").forEach((el) => el.classList.remove("reveal"));
      c.querySelectorAll("a, button").forEach((el) => el.setAttribute("tabindex", "-1"));
      const card = c.firstElementChild;
      if (card && card.classList) {
        card.classList.remove("reveal");
        if (card.matches("a")) card.setAttribute("tabindex", "-1");
      }
      return c;
    }
    const before = originals.map(copy);
    const after = originals.map(copy);
    before.forEach((c) => track.insertBefore(c, originals[0]));
    after.forEach((c) => track.appendChild(c));
    const slides = before.concat(originals, after);

    const dots = originals.map(() => dotsBox.appendChild(document.createElement("i")));

    let active = -1;
    let queued = false;
    let restId = 0;
    let pending = -1; /* the slide a smooth step is heading for */

    function slideCentre(slide) {
      return slide.offsetLeft + slide.offsetWidth / 2;
    }

    /* the width of one full set of projects, gaps included */
    function setWidth() {
      return originals[0].offsetLeft - before[0].offsetLeft;
    }

    function update() {
      queued = false;
      const centre = track.scrollLeft + track.clientWidth / 2;
      let nearest = 0;
      let best = Infinity;
      slides.forEach((slide, i) => {
        const raw = (slideCentre(slide) - centre) / slide.offsetWidth;
        /* only the slides near the centre are worth a style write */
        if (Math.abs(raw) > 3) {
          if (slide.style.getPropertyValue("--f") !== "0") {
            slide.style.setProperty("--d", raw < 0 ? "-2" : "2");
            slide.style.setProperty("--f", "0");
          }
        } else {
          const d = Math.max(-2, Math.min(2, raw));
          slide.style.setProperty("--d", d.toFixed(3));
          slide.style.setProperty("--f", Math.max(0, 1 - Math.abs(d)).toFixed(3));
        }
        if (Math.abs(raw) < best) {
          best = Math.abs(raw);
          nearest = i;
        }
      });
      if (nearest !== active) {
        if (active > -1) {
          slides[active].classList.remove("is-active");
          dots[active % n].classList.remove("is-on");
        }
        active = nearest;
        slides[active].classList.add("is-active");
        dots[active % n].classList.add("is-on");
      }
    }

    function queue() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    }

    /* off the originals: step one set back towards them, invisibly */
    function recentre() {
      pending = -1;
      if (active >= n && active < 2 * n) return;
      track.scrollLeft += active < n ? setWidth() : -setWidth();
      update();
    }

    /* step from the project the track is heading for, not the one it is
       passing, so a run of quick clicks counts every click. When that
       project is a copy, jump a set first so the run can never walk off
       the end of the copies. */
    function step(delta) {
      update(); /* the last scroll frame may not have been read yet */
      let base = pending > -1 ? pending : active;
      const shift = base < n ? n : base >= 2 * n ? -n : 0;
      if (shift && active + shift >= 0 && active + shift < slides.length) {
        track.scrollLeft += shift > 0 ? setWidth() : -setWidth();
        base += shift;
        update();
      }
      pending = Math.max(0, Math.min(slides.length - 1, base + delta));
      goToIndex(pending);
      /* a step that never scrolls must not leave a stale target behind */
      clearTimeout(restId);
      restId = setTimeout(recentre, 700);
    }

    function goToIndex(i, instant) {
      const k = Math.max(0, Math.min(slides.length - 1, i));
      const left = slideCentre(slides[k]) - track.clientWidth / 2;
      track.scrollTo({ left: left, behavior: instant || reduced ? "auto" : "smooth" });
    }

    track.addEventListener(
      "scroll",
      () => {
        queue();
        /* recentre once the track has come to rest (scrollend is not
           everywhere yet, so a short quiet period stands in for it) */
        clearTimeout(restId);
        restId = setTimeout(recentre, 160);
      },
      { passive: true }
    );
    window.addEventListener("resize", () => {
      goToIndex(active, true);
      queue();
    });

    prev.addEventListener("click", () => step(-1));
    next.addEventListener("click", () => step(1));

    /* a side project is brought to the centre first; only the magnified
       one follows its link */
    slides.forEach((slide) => {
      slide.addEventListener("click", (ev) => {
        const i = slides.indexOf(slide);
        if (i === active) return;
        ev.preventDefault();
        goToIndex(i);
      });
      /* tabbing onto a card centres it, so focus is never off to the side */
      slide.addEventListener("focusin", () => {
        const i = slides.indexOf(slide);
        if (i !== active) goToIndex(i);
      });
    });

    /* the arrow keys step a whole project, not the browser's 40px */
    track.addEventListener("keydown", (ev) => {
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
      ev.preventDefault();
      step(ev.key === "ArrowRight" ? 1 : -1);
    });

    /* open on the original marked data-start, with a neighbour either side */
    const start = originals.findIndex((s) => s.hasAttribute("data-start"));
    const home = n + (start > -1 ? start : 0);
    goToIndex(home, true);
    update();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        goToIndex(active, true);
        update();
      });
    }
  });
})();

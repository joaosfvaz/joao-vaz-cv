/* ------------------------------------------------------------------ *
 *  Scene — the liquid glass behind every page.
 *
 *  CSS already keeps the scene alive: the light drifts, and the two
 *  glass bands flow sideways and breathe. This file couples the bands
 *  to the scroll and raises the veil:
 *
 *  1. Each band rises and falls at its own rate as the page scrolls,
 *     so the two slide past each other.
 *  2. Fast scrolling stretches the bands a little; they settle when the
 *     page does.
 *  3. As the hero leaves, a veil rises over the scene so the copy has a
 *     calm ground to sit on.
 *
 *  One clock: this runs inside window.Scroll's frame loop. With reduced
 *  motion it does nothing and the scene holds still.
 * ------------------------------------------------------------------ */
(function () {
  "use strict";

  const scene = document.getElementById("scene");
  const S = window.Scroll;
  if (!scene || !S || S.reduced) return;

  const clamp = S.clamp;
  const veil = scene.querySelector(".scene__veil");
  const back = scene.querySelector(".scene__band--back");
  const front = scene.querySelector(".scene__band--front");

  /* the veil starts clear over a hero, part-way on a page without one */
  const VEIL_FROM = document.querySelector(".hero") ? 0 : 0.42;
  const VEIL_TO = 0.58;

  let lastY = S.state.y;
  let vel = 0;
  let veilNow = -1;

  function place(el, y, stretch) {
    if (!el) return;
    el.style.transform =
      "translate3d(0," + y.toFixed(1) + "px,0) scaleY(" + (1 + stretch).toFixed(4) + ")";
  }

  S.onFrame((st) => {
    /* scroll speed, smoothed */
    vel += (st.y - lastY - vel) * 0.16;
    lastY = st.y;
    const stretch = Math.min(Math.abs(vel) / 45, 1) * 0.12;

    const p = st.progress;
    place(back, Math.sin(p * Math.PI * 3) * st.vh * 0.14, stretch * 0.6);
    place(front, -Math.sin(p * Math.PI * 2) * st.vh * 0.18, stretch);

    if (veil) {
      const e = S.smoothstep(clamp(st.y / (st.vh * 0.9), 0, 1));
      const v = VEIL_FROM + (VEIL_TO - VEIL_FROM) * e;
      if (Math.abs(v - veilNow) > 0.004) {
        veil.style.opacity = v.toFixed(3);
        veilNow = v;
      }
    }
  });
})();

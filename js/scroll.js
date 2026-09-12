/* ------------------------------------------------------------------ *
 *  Scroll driver — the single reader of scroll position on the page.
 *
 *  Everything that reacts to scroll (the 3D scene, the DOM effects,
 *  the progress bar) subscribes here. Layout metrics are cached on
 *  resize, scrollY is sampled once per frame, and one rAF loop drives
 *  every consumer — so the whole page moves on the same clock.
 * ------------------------------------------------------------------ */
(function () {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SECTION_IDS = ["top", "about", "work", "building", "skills", "contact"];

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const invLerp = (a, b, v) => (b === a ? 0 : clamp((v - a) / (b - a), 0, 1));
  const smoothstep = (t) => t * t * (3 - 2 * t);
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  /* live state, shared by reference with every consumer */
  const state = {
    y: 0,          // raw scrollY, sampled once per frame
    max: 1,        // scrollable distance in px
    progress: 0,   // 0..1 through the document
    vw: window.innerWidth,
    vh: window.innerHeight,
    t: 0,          // seconds since start
    reduced: reduced,
  };

  /* id -> { el, top, height, mid } in document coordinates */
  const anchors = Object.create(null);

  const frameCbs = [];   // run every rAF frame (motion)
  const scrollCbs = [];  // run on scroll events (cheap UI state)
  const measureCbs = []; // run after every re-measure

  /* ---------------- measurement (layout reads live here only) ------ */
  function measure() {
    state.vw = window.innerWidth;
    state.vh = window.innerHeight;
    state.max = Math.max(1, document.documentElement.scrollHeight - state.vh);

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      anchors[id] = { el: el, top: top, height: r.height, mid: top + r.height / 2 };
    });

    for (let i = 0; i < measureCbs.length; i++) measureCbs[i](state, anchors);
  }

  /* ---------------- per-section progress helpers ------------------- */

  /* 0 when the section top reaches the viewport bottom,
     1 when the section top reaches the viewport top. */
  function enterProgress(id) {
    const a = anchors[id];
    if (!a) return 0;
    return invLerp(a.top - state.vh, a.top, state.y);
  }

  /* 0 when the section enters the viewport,
     1 when its bottom edge leaves the top of the viewport. */
  function throughProgress(id) {
    const a = anchors[id];
    if (!a) return 0;
    return invLerp(a.top - state.vh, a.top + a.height, state.y);
  }

  /* 0..1 across the section's own height, measured from its top. */
  function selfProgress(id) {
    const a = anchors[id];
    if (!a) return 0;
    return invLerp(a.top, a.top + a.height - state.vh * 0.5, state.y);
  }

  /* ---------------- loop ------------------------------------------- */
  let started = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    if (!started) started = now;
    state.t = (now - started) / 1000;
    state.y = window.scrollY || window.pageYOffset || 0;
    state.progress = clamp(state.y / state.max, 0, 1);
    for (let i = 0; i < frameCbs.length; i++) frameCbs[i](state);
  }

  function fireScroll() {
    state.y = window.scrollY || window.pageYOffset || 0;
    state.progress = clamp(state.y / state.max, 0, 1);
    for (let i = 0; i < scrollCbs.length; i++) scrollCbs[i](state);
  }

  /* ---------------- public API ------------------------------------- */
  const Scroll = {
    state: state,
    anchors: anchors,
    reduced: reduced,
    clamp: clamp,
    lerp: lerp,
    invLerp: invLerp,
    smoothstep: smoothstep,
    easeOutCubic: easeOutCubic,
    enterProgress: enterProgress,
    throughProgress: throughProgress,
    selfProgress: selfProgress,
    measure: measure,

    /* motion callbacks. Under reduced motion they never loop — each one
       runs a single settled pass so the page renders its end state. */
    onFrame: function (cb) {
      if (reduced) {
        measure();
        fireScroll();
        cb(state);
        return;
      }
      frameCbs.push(cb);
    },
    onScroll: function (cb) {
      scrollCbs.push(cb);
    },
    onMeasure: function (cb) {
      measureCbs.push(cb);
      if (anchors.top) cb(state, anchors);
    },
  };

  window.Scroll = Scroll;

  /* ---------------- wiring ----------------------------------------- */
  let resizeId = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeId);
    resizeId = setTimeout(measure, 120);
  });
  window.addEventListener("scroll", fireScroll, { passive: true });
  window.addEventListener("load", function () {
    measure();
    fireScroll();
  });

  measure();
  fireScroll();
  if (!reduced) requestAnimationFrame(frame);
})();

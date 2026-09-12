/* ------------------------------------------------------------------ *
 *  Scroll driver — the single reader of scroll position on the page.
 *
 *  Everything that reacts to scroll (the reveals, the hero, the
 *  timeline, the progress bar) subscribes here. Layout metrics and
 *  section anchors are cached on resize, scrollY is sampled once per
 *  frame, and one rAF loop drives every consumer — so the whole page
 *  moves on the same clock.
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

  /* Re-measuring moves every element's recorded position, so the
     consumers have to be re-tested against the current scroll straight
     away. Without this, a layout shift after load — the webfonts
     swapping in is the usual one — leaves a deep-linked page holding
     reveals that already sit inside the viewport, until the reader
     happens to scroll. */
  function remeasure() {
    measure();
    fireScroll();
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
    measure: remeasure,

    /* motion callbacks. Under reduced motion they never loop — each one
       runs a single settled pass so the page renders its end state. */
    onFrame: function (cb) {
      if (reduced) {
        remeasure();
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
    resizeId = setTimeout(remeasure, 120);
  });
  window.addEventListener("scroll", fireScroll, { passive: true });
  window.addEventListener("load", remeasure);

  remeasure();
  if (!reduced) requestAnimationFrame(frame);
})();

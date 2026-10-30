/* ------------------------------------------------------------------ *
 *  The site's behaviour — the home page and the project pages run the
 *  same file: reveals, word-by-word headings, the hero (name, photo,
 *  dot field, scroll depth), counters, the word strip, the accordions,
 *  the playable trace, the copy button and the navigation (bar, section
 *  index, dock). Every part looks for its own markup and skips itself
 *  when the page has none.
 *
 *  The same two rules as the rest of the site:
 *
 *  1. Fail open. The document is written in its finished state; the
 *     `.js` class on <html> is the only thing that hides anything.
 *  2. One clock. Everything that reacts to scrolling subscribes to
 *     window.Scroll (js/scroll.js). Nothing here binds its own scroll
 *     listener.
 * ------------------------------------------------------------------ */
(function () {
  "use strict";

  const S = window.Scroll;
  const reduced = S.reduced;
  const clamp = S.clamp;
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.prototype.slice.call((el || document).querySelectorAll(sel));

  /* ------------------------------------------------------------------
   * The view — recruiter or curious, set before the first paint by the
   * head script (S.mode). In the curious view the side quests live on
   * the page: their content moves out of the dialog into its section
   * here, before anything below reads the page, so it is written once.
   * ---------------------------------------------------------------- */
  const root = document.documentElement;
  if (S.mode === "curious") {
    const host = $("[data-quests-inline]");
    const inner = $("#side-quests .quests__inner");
    if (host && inner) {
      $$(".player, .quests__grid, .photolog", inner).forEach((el) => {
        el.classList.add("rv");
        host.appendChild(el);
      });
    }
  }

  /* ------------------------------------------------------------------
   * The name — each line rises out of its mask, "Vaz" just after "João".
   * ---------------------------------------------------------------- */
  requestAnimationFrame(() => $$(".hero__name .line").forEach((l) => l.classList.add("is-lit")));

  /* ------------------------------------------------------------------
   * Headings — every word goes into its own mask, so a heading rises
   * word by word when it reveals. Words inside an <em> stay inside it
   * and keep its colour. The text itself is unchanged.
   * ---------------------------------------------------------------- */
  $$(".head h2, .contact__title, .proj__title").forEach((h) => {
    let wi = 0;
    function walk(src, dest) {
      Array.prototype.slice.call(src.childNodes).forEach((n) => {
        if (n.nodeType === 1) {
          const clone = n.cloneNode(false);
          dest.appendChild(clone);
          walk(n, clone);
          return;
        }
        if (n.nodeType !== 3) return;
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { dest.appendChild(document.createTextNode(" ")); return; }
          const w = document.createElement("span");
          const inner = document.createElement("span");
          w.className = "w";
          inner.textContent = part;
          inner.style.setProperty("--wi", String(wi++));
          w.appendChild(inner);
          dest.appendChild(w);
        });
      });
    }
    const frag = document.createDocumentFragment();
    walk(h, frag);
    h.textContent = "";
    h.appendChild(frag);
    h.classList.add("h-split");
  });

  /* ------------------------------------------------------------------
   * Counters — count up to the value already written in the markup.
   * ---------------------------------------------------------------- */
  function count(el) {
    if (!el || reduced) return;
    if (!el.dataset.final) el.dataset.final = el.textContent;
    const to = parseFloat(el.dataset.count);
    const pre = el.dataset.prefix || "";
    const suf = el.dataset.suffix || "";
    const fmt = (n) => pre + (to >= 1000 ? n.toLocaleString("en-US") : String(n)) + suf;
    const t0 = performance.now();
    (function tick(now) {
      const p = clamp((now - t0) / 1400, 0, 1);
      el.textContent = fmt(Math.round(to * S.easeOutCubic(p)));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* paper never shows a number halfway: printing puts the final value
     back, the one the markup carries */
  window.addEventListener("beforeprint", () => {
    $$("[data-count]").forEach((el) => { if (el.dataset.final) el.textContent = el.dataset.final; });
  });

  /* ------------------------------------------------------------------
   * Reveals — driven by position, not IntersectionObserver: a deep link
   * or a fast flick cannot skip one. Each element is indexed among its
   * revealing siblings, so a group lands as a run of beats.
   * ---------------------------------------------------------------- */
  /* tags in the toolkit land one after another: each knows its place */
  $$(".tags").forEach((ul) => {
    Array.prototype.slice.call(ul.children).forEach((li, i) => li.style.setProperty("--t", String(Math.min(i, 10))));
  });

  const rvs = $$(".rv");
  const seen = new Map();
  rvs.forEach((el) => {
    const n = seen.get(el.parentElement) || 0;
    seen.set(el.parentElement, n + 1);
    el.style.setProperty("--i", String(Math.min(n, 6)));
  });

  const onEnter = [];
  function enter(el) {
    if (el.classList.contains("is-in")) return;
    el.classList.add("is-in");
    $$("[data-count]", el).forEach(count);
    onEnter.forEach((fn) => fn(el));
  }

  let marks = [];
  if (reduced) {
    rvs.forEach(enter);
  } else {
    S.onMeasure(() => {
      marks = rvs.map((el) => {
        const r = el.getBoundingClientRect();
        return { el: el, top: r.top + window.scrollY, done: el.classList.contains("is-in") };
      });
    });
    S.onScroll((st) => {
      for (let i = 0; i < marks.length; i++) {
        const m = marks[i];
        if (!m.done && m.top < st.y + st.vh * 0.92) { m.done = true; enter(m.el); }
      }
    });
    /* last resort: whatever is still hidden three seconds after load is
       a bug above, and a blank block is worse than a skipped animation */
    window.addEventListener("load", () => {
      setTimeout(() => marks.forEach((m) => {
        if (!m.done && m.top < window.scrollY + window.innerHeight) { m.done = true; enter(m.el); }
      }), 3000);
    });
  }

  /* ------------------------------------------------------------------
   * The photo — wiped in by CSS when it reveals; after that it drifts a
   * little against the scroll.
   * ---------------------------------------------------------------- */
  const photo = $(".hero__photo");
  if (photo && !reduced) {
    const img = $("img", photo);
    onEnter.push((el) => {
      if (el === photo) setTimeout(() => photo.classList.add("is-settled"), 2500);
    });
    S.onFrame((st) => {
      if (st.y > st.vh * 1.4) return;
      /* capped inside the overscan the frame keeps (scale 1.1) */
      img.style.setProperty("--py", Math.min(st.y * 0.05, 24).toFixed(1) + "px");
    });
  }

  /* ------------------------------------------------------------------
   * Scroll depth — as the hero leaves, its copy lifts a little faster
   * than the page and dims, so the name and the photo part company.
   * ---------------------------------------------------------------- */
  const heroCopy = $(".hero__copy");
  if (heroCopy && !reduced) {
    S.onFrame((st) => {
      if (st.y > st.vh * 1.4) return;
      heroCopy.style.transform = "translate3d(0," + (st.y * -0.14).toFixed(1) + "px,0)";
      heroCopy.style.opacity = (1 - clamp(st.y / st.vh, 0, 1) * 0.55).toFixed(3);
    });
  }

  /* ------------------------------------------------------------------
   * The word strip — runs sideways at a steady pace, speeds up with the
   * scroll and turns round when the scroll does. The set of words is
   * copied once; when the track has moved by one set it jumps back by
   * exactly that much, which draws the same frame.
   * ---------------------------------------------------------------- */
  const strip = $("[data-strip]");
  if (strip && !reduced) {
    Array.prototype.slice.call(strip.children).forEach((c) => strip.appendChild(c.cloneNode(true)));
    let half = 0, x = 0, dir = 1, top = 0, bottom = 0;
    let lastY = S.state.y;
    S.onMeasure(() => {
      half = strip.getBoundingClientRect().width / 2;
      const r = strip.parentElement.getBoundingClientRect();
      top = r.top + window.scrollY;
      bottom = top + r.height;
    });
    S.onFrame((st) => {
      const dy = st.y - lastY;
      lastY = st.y;
      if (dy) dir = dy > 0 ? 1 : -1;
      if (!half || bottom < st.y || top > st.y + st.vh) return;
      x -= (0.6 + Math.min(Math.abs(dy), 80) * 0.3) * dir;
      if (x <= -half) x += half;
      else if (x > 0) x -= half;
      strip.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0)";
    });
  }

  /* ------------------------------------------------------------------
   * The dot field — a flat grid of dots behind the hero. Dots rise and
   * brighten under the pointer, a ripple runs out from the photo once
   * it lands, and a click or a tap sends another. The loop only runs
   * while something is moving; at rest the canvas costs nothing.
   * ---------------------------------------------------------------- */
  const hero = $(".hero");
  const cv = $(".hero__field");
  if (hero && cv && cv.getContext) {
    const ctx = cv.getContext("2d");
    /* the two accent colours, read from the stylesheet as "r, g, b" */
    const rgb = (name) => {
      const hex = getComputedStyle(document.body).getPropertyValue(name).trim().replace("#", "");
      const n = parseInt(hex.length === 3 ? hex.replace(/./g, "$&$&") : hex, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(", ");
    };
    let POINTER = rgb("--accent");
    let RIPPLE = rgb("--accent-2");
    let INK = rgb("--ink");
    /* a theme switch repaints the field in the new colours */
    document.addEventListener("themechange", () => {
      POINTER = rgb("--accent");
      RIPPLE = rgb("--accent-2");
      INK = rgb("--ink");
      kick();
    });
    const GAP = 26;
    const REACH = 170;
    let W = 0, H = 0, dots = [], raf = 0;
    let px = -1e4, py = -1e4;
    const ripples = [];

    function size() {
      const r = hero.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width;
      H = r.height;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      for (let y = GAP / 2; y < H; y += GAP) {
        for (let x = GAP / 2; x < W; x += GAP) dots.push({ x: x, y: y, v: 0, f: 1 - (y / H) * 0.55 });
      }
      kick();
    }

    function draw(now) {
      raf = 0;
      ctx.clearRect(0, 0, W, H);
      let moving = false;
      for (let i = ripples.length - 1; i >= 0; i--) {
        if ((now - ripples[i].t0) * 0.75 > Math.hypot(W, H)) ripples.splice(i, 1);
      }
      /* resting dots go into one path; lit ones are drawn one by one */
      ctx.beginPath();
      const lit = [];
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        let target = 0;
        let fromRipple = 0;
        if (!reduced) {
          const dist = Math.hypot(d.x - px, d.y - py);
          if (dist < REACH) {
            const t = 1 - dist / REACH;
            target = t * t * (3 - 2 * t);
          }
          for (let k = 0; k < ripples.length; k++) {
            const rp = ripples[k];
            const front = (now - rp.t0) * 0.75;
            const band = 1 - Math.abs(Math.hypot(d.x - rp.x, d.y - rp.y) - front) / 70;
            const w = band * clamp(1 - front / 1400, 0, 1);
            if (band > 0 && w > target) { target = w; fromRipple = 1; }
          }
        }
        if (target > 0.02) d.r = fromRipple;
        d.v += (target - d.v) * 0.16;
        if (Math.abs(target - d.v) > 0.004) moving = true;
        if (d.v < 0.02) {
          ctx.moveTo(d.x + 1, d.y);
          ctx.arc(d.x, d.y, 1, 0, 6.2832);
        } else {
          lit.push(d);
        }
      }
      ctx.fillStyle = "rgba(" + INK + ", 0.12)";
      ctx.fill();
      /* lit dots take colour: the accent under the pointer, the second
         colour in a ripple */
      for (let i = 0; i < lit.length; i++) {
        const d = lit[i];
        ctx.fillStyle = "rgba(" + (d.r ? RIPPLE : POINTER) + ", " + (0.25 + d.v * 0.75 * d.f).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1 + d.v * 2.4, 0, 6.2832);
        ctx.fill();
      }
      if (moving || ripples.length) kick();
    }

    function kick() {
      if (!raf) raf = requestAnimationFrame(draw);
    }

    function ripple(x, y) {
      if (reduced) return;
      ripples.push({ x: x, y: y, t0: performance.now() });
      kick();
    }

    S.onMeasure(size);
    if (!reduced) {
      hero.addEventListener("pointermove", (ev) => {
        if (ev.pointerType !== "mouse") return;
        const r = hero.getBoundingClientRect();
        px = ev.clientX - r.left;
        py = ev.clientY - r.top;
        /* the colour block behind the photo leans away from the pointer */
        if (photo) {
          photo.style.setProperty("--bx", ((0.5 - px / r.width) * 24).toFixed(1));
          photo.style.setProperty("--by", ((0.5 - py / r.height) * 24).toFixed(1));
        }
        kick();
      });
      hero.addEventListener("pointerleave", () => {
        px = py = -1e4;
        if (photo) { photo.style.setProperty("--bx", "0"); photo.style.setProperty("--by", "0"); }
        kick();
      });
      hero.addEventListener("pointerdown", (ev) => {
        if (ev.target.closest("a, button")) return;
        const r = hero.getBoundingClientRect();
        ripple(ev.clientX - r.left, ev.clientY - r.top);
      });
      onEnter.push((el) => {
        if (el !== photo) return;
        setTimeout(() => {
          const h = hero.getBoundingClientRect();
          const p = photo.getBoundingClientRect();
          ripple(p.left - h.left + p.width / 2, p.top - h.top + p.height / 2);
        }, 1300);
      });
    }
  }

  /* ------------------------------------------------------------------
   * Copy the email — the mail link copies the address instead and says
   * so; if the clipboard is not available it stays a mail link.
   * ---------------------------------------------------------------- */
  $$("[data-copy]").forEach((btn) => {
    const label = $("[data-copy-label]", btn);
    const status = $("[data-copy-status]");
    const idle = label.textContent;
    let timer = 0;
    btn.addEventListener("click", (ev) => {
      const addr = btn.dataset.copy;
      /* no clipboard: let the mail link do its job */
      if (!(navigator.clipboard && window.isSecureContext)) return;
      ev.preventDefault();
      const done = () => {
        label.textContent = "Copied — " + addr;
        btn.classList.add("is-done");
        if (status) status.textContent = "Email address copied.";
        clearTimeout(timer);
        timer = setTimeout(() => {
          label.textContent = idle;
          btn.classList.remove("is-done");
        }, 2600);
      };
      navigator.clipboard.writeText(addr).then(done, () => { window.location.href = "mailto:" + addr; });
    });
  });

  /* ------------------------------------------------------------------
   * Accordions — one open item per group. The panel height is a CSS
   * grid-rows transition; once it settles the page is re-measured, so
   * reveals and the navigation track the new layout.
   * ---------------------------------------------------------------- */
  let accId = 0;
  $$("[data-acc]").forEach((group) => {
    const items = $$(":scope > .acc__item", group);
    let settle = 0;
    function set(item, open) {
      item.classList.toggle("is-open", open);
      $(".acc__head", item).setAttribute("aria-expanded", String(open));
    }
    items.forEach((item) => {
      const head = $(".acc__head", item);
      const panel = $(".acc__panel", item);
      panel.id = "acc-" + ++accId;
      head.setAttribute("aria-controls", panel.id);
      head.addEventListener("click", () => {
        const open = !item.classList.contains("is-open");
        items.forEach((other) => set(other, false));
        set(item, open);
        /* a role's numbers count up again each time it opens */
        if (open) $$("[data-count]", item).forEach(count);
        clearTimeout(settle);
        settle = setTimeout(() => S.measure(), 600);
      });
    });
  });

  /* ------------------------------------------------------------------
   * The trace — three illustrative runs. Each plays part by part: the
   * question, the spans drawing their bars on a shared timeline, the
   * answer, the evals. Picking another question cancels the run in
   * progress. Each span: [label, duration, start %, width %, kind].
   * ---------------------------------------------------------------- */
  const RUNS = [
    {
      q: "Why isn't my Audi A4 getting leads?",
      spans: [
        ["route → pricing & performance agent", "38 ms", 0, 14, ""],
        ["tool · listing_performance(car)", "212 ms", 8, 30, "is-tool"],
        ["tool · fair_price(car)", "187 ms", 10, 26, "is-tool"],
        ["mandate · read-only ✓", "2 ms", 40, 6, "is-check"],
        ["answer · grounded in 2 tool results", "1.4 s", 46, 44, ""],
      ],
      a: "It's priced 9% above similar A4s and views fell after day 12. Cars like it sell in about 24 days at market price.",
      evals: ["correctness", "groundedness", "scope", "plain language"],
    },
    {
      q: "Lower my Golf to its market price.",
      spans: [
        ["route → pricing agent", "41 ms", 0, 12, ""],
        ["tool · fair_price(car)", "176 ms", 8, 22, "is-tool"],
        ["mandate · changes data", "3 ms", 31, 5, "is-check"],
        ["human · the dealer confirms the price", "4.2 s", 37, 32, "is-human"],
        ["tool · update_price(car) · revert supported", "264 ms", 70, 14, "is-tool"],
        ["answer · change made, undo offered", "0.9 s", 85, 15, ""],
      ],
      a: "Done. Your Golf is now listed at €18,400, the market price for its specs. You can undo this change.",
      evals: ["correctness", "confirmation asked", "revertible", "scope"],
    },
    {
      q: "What's the weather in Lisbon tomorrow?",
      spans: [
        ["route → no matching agent", "36 ms", 0, 14, ""],
        ["guardrail · out of scope", "4 ms", 16, 6, "is-stop"],
        ["answer · refusal with a handover", "0.6 s", 24, 30, ""],
      ],
      a: "I can help with your listings, prices and the car market, but not the weather. Want to see how your stock is doing instead?",
      evals: ["refusal behaviour", "scope adherence", "plain language"],
    },
    /* the hidden run: no tab plays it — typing "evals" does */
    {
      q: "Who built this website?",
      spans: [
        ["route → about-the-builder agent", "29 ms", 0, 12, ""],
        ["tool · read_cv(\"João Vaz\")", "143 ms", 8, 24, "is-tool"],
        ["tool · git_log(\"joao-vaz.com\")", "201 ms", 10, 30, "is-tool"],
        ["mandate · read-only ✓", "2 ms", 42, 6, "is-check"],
        ["answer · grounded in 2 tool results", "0.8 s", 50, 40, ""],
      ],
      a: "João Vaz — a product manager who reads agent traces for fun. He built this site by hand: no framework, one scroll driver, a little AI. You found the hidden run.",
      evals: ["correctness", "groundedness", "self-awareness"],
    },
  ];

  const trace = $("[data-trace]");
  if (trace) {
    const run = $("[data-trace-run]", trace);
    const tabs = $$("[data-run]", trace);
    const again = $("[data-again]", trace);
    let timers = [];
    let current = 0;
    let started = false;

    function el(tag, cls, text) {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    }

    function render(i) {
      const r = RUNS[i];
      /* hold the old height while the new run is built, so swapping
         questions never makes the page jump */
      run.style.minHeight = run.offsetHeight + "px";
      requestAnimationFrame(() => { run.style.minHeight = ""; });
      run.textContent = "";
      const q = el("p", "trace__q st");
      q.appendChild(el("span", null, "dealer"));
      q.appendChild(document.createTextNode("“" + r.q + "”"));
      run.appendChild(q);
      const ol = el("ol", "trace__spans");
      r.spans.forEach((s) => {
        const li = el("li", ("st " + s[4]).trim());
        li.style.setProperty("--s", String(s[2]));
        li.style.setProperty("--w", String(s[3]));
        li.appendChild(el("span", null, s[0]));
        li.appendChild(el("em", null, s[1]));
        ol.appendChild(li);
      });
      run.appendChild(ol);
      const a = el("p", "trace__a st");
      a.appendChild(el("span", null, "assistant"));
      a.appendChild(document.createTextNode("“" + r.a + "”"));
      run.appendChild(a);
      const ev = el("ul", "trace__evals");
      r.evals.forEach((e) => ev.appendChild(el("li", "st", e)));
      run.appendChild(ev);
    }

    function play(i) {
      started = true; /* a pick before the trace is on screen wins */
      timers.forEach(clearTimeout);
      timers = [];
      current = i;
      tabs.forEach((t, k) => t.setAttribute("aria-selected", String(k === i)));
      again.hidden = true;
      render(i);
      const parts = $$(".st", run);
      if (reduced) {
        parts.forEach((p) => p.classList.add("on"));
        again.hidden = false;
        return;
      }
      /* the question, then each span, a pause for the model, then the
         answer and the evals in a quick run */
      let t = 120;
      parts.forEach((p) => {
        const isSpan = p.tagName === "LI" && p.parentElement.classList.contains("trace__spans");
        const isEval = p.parentElement.classList.contains("trace__evals");
        t += isSpan ? 420 : isEval ? 140 : 600;
        timers.push(setTimeout(() => p.classList.add("on"), t));
      });
      timers.push(setTimeout(() => { again.hidden = false; }, t + 300));
    }

    tabs.forEach((tab, k) => {
      tab.addEventListener("click", () => play(k));
      tab.addEventListener("keydown", (ev) => {
        if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
        const next = (k + (ev.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
        tabs[next].focus();
        play(next);
      });
    });
    again.addEventListener("click", () => play(current));
    /* the easter egg asks for the hidden run */
    document.addEventListener("egg-evals", () => {
      trace.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      setTimeout(() => play(RUNS.length - 1), reduced ? 0 : 500);
    });

    /* the first run waits until the trace is on screen */
    render(0);
    function start() {
      if (started) return;
      started = true;
      play(0);
    }
    if (reduced) start();
    onEnter.push((node) => { if (node === trace) setTimeout(start, 300); });
  }

  /* ------------------------------------------------------------------
   * Navigation — the bar, the section index and the dock all mark the
   * section under the reading line, a third of the way down the window.
   * The bar's hairline and each index line fill with the reading.
   * ---------------------------------------------------------------- */
  const bar = $("#bar");
  const rail = $$(".rail").filter(S.inMode)[0];
  const navLinks = $$("[data-nav]").filter(S.inMode);
  /* the sections are whatever the page's own links point at, in order
     (this view's links only, the same rule as js/scroll.js) */
  const ids = navLinks.map((a) => a.dataset.nav).filter((id, i, all) => all.indexOf(id) === i);
  const railFills = {};
  $$(".rail a").filter(S.inMode).forEach((a) => { railFills[a.dataset.nav] = $("i", a); });
  let active = "";

  function sync(st) {
    const line = st.y + st.vh * 0.34;
    let next = "";
    ids.forEach((id) => {
      const an = S.anchors[id];
      if (!an) return;
      if (line >= an.top) next = id;
      if (railFills[id]) railFills[id].style.setProperty("--f", clamp((line - an.top) / an.height, 0, 1).toFixed(3));
    });
    /* the last section is short: at the very bottom it is the one */
    if (st.y >= st.max - 4 && ids.length) next = ids[ids.length - 1];
    if (next !== active) {
      active = next;
      navLinks.forEach((a) => {
        const on = a.dataset.nav === active;
        a.classList.toggle("is-active", on);
        if (on) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    }
    if (bar) {
      bar.classList.toggle("is-scrolled", st.y > 8);
      bar.style.setProperty("--p", st.progress.toFixed(4));
    }
    /* the index stays out of the hero and the word strip, where the bar
       already shows the sections; the dock is always there, under the
       thumb */
    const first = S.anchors[ids[0]];
    if (rail) rail.classList.toggle("is-hidden", st.y < (first ? first.top - st.vh * 0.4 : st.vh * 0.5));
  }
  S.onScroll(sync);
  S.onMeasure((st) => sync(st));

  /* ------------------------------------------------------------------
   * The bands — every other section in the other theme's colours. Each
   * one opens to the full width as it reaches the middle of the screen
   * and closes again as it leaves (--g, read by home.css). The bar, the
   * index and the dock take a band's colours while it is under them.
   * ---------------------------------------------------------------- */
  const bands = $$(".section.invert").filter(S.inMode);
  if (bands.length) {
    let spans = [];
    S.onMeasure(() => {
      spans = bands.map((el) => {
        const r = el.getBoundingClientRect();
        return { el: el, top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, g: -1 };
      });
    });
    if (!reduced) {
      S.onFrame((st) => {
        for (let i = 0; i < spans.length; i++) {
          const b = spans[i];
          const g = S.smoothstep(clamp(Math.min(st.y + st.vh - b.top, b.bottom - st.y) / (st.vh * 0.5), 0, 1));
          if (Math.abs(g - b.g) < 0.001) continue;
          b.g = g;
          b.el.style.setProperty("--g", g.toFixed(3));
        }
      });
    }
    /* each fixed part reads the page at its own height */
    const dock = $$(".dock").filter(S.inMode)[0];
    const parts = [[bar, () => 32], [rail, (st) => st.vh / 2], [dock, (st) => st.vh - 32]].filter((p) => p[0]);
    const fades = new Map();
    const tint = (st) => parts.forEach((p) => {
      const el = p[0];
      const y = st.y + p[1](st);
      const on = spans.some((b) => y >= b.top && y < b.bottom);
      if (on === el.classList.contains("invert")) return;
      if (!reduced) {
        el.classList.add("theme-fade");
        clearTimeout(fades.get(el));
        fades.set(el, setTimeout(() => el.classList.remove("theme-fade"), 450));
      }
      el.classList.toggle("invert", on);
    });
    S.onScroll(tint);
    S.onMeasure((st) => tint(st));
  }

  /* ------------------------------------------------------------------
   * Theme — light or dark. The head script set it before the first
   * paint (a saved choice, else the system's). The switch flips it,
   * remembers the choice and tells anything drawn on a canvas to
   * repaint. Until the visitor chooses, the page follows the system.
   * ---------------------------------------------------------------- */
  const doc = document.documentElement;
  const themeMeta = $('meta[name="theme-color"]');
  const themeBtns = $$("[data-theme-toggle]");
  let fadeTimer = 0;
  function setTheme(t, fade) {
    if (fade && !reduced) {
      doc.classList.add("theme-fade");
      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(() => doc.classList.remove("theme-fade"), 450);
    }
    doc.setAttribute("data-theme", t);
    themeBtns.forEach((b) => {
      b.setAttribute("aria-label", t === "light" ? "Switch to the dark theme" : "Switch to the light theme");
    });
    if (themeMeta) themeMeta.setAttribute("content", getComputedStyle(doc).getPropertyValue("--bg").trim());
    document.dispatchEvent(new CustomEvent("themechange", { detail: t }));
  }
  setTheme(doc.getAttribute("data-theme") === "light" ? "light" : "dark", false);
  themeBtns.forEach((b) => b.addEventListener("click", () => {
    const next = doc.getAttribute("data-theme") === "light" ? "dark" : "light";
    try { localStorage.setItem("theme", next); } catch (e) { /* private mode: the choice lasts this page */ }
    setTheme(next, true);
  }));
  const systemLight = window.matchMedia("(prefers-color-scheme: light)");
  if (systemLight.addEventListener) {
    systemLight.addEventListener("change", () => {
      let saved = null;
      try { saved = localStorage.getItem("theme"); } catch (e) { /* no storage: follow the system */ }
      if (!saved) setTheme(systemLight.matches ? "light" : "dark", true);
    });
  }

  /* ------------------------------------------------------------------
   * Easter eggs — small rewards for the curious, invisible otherwise: a
   * note in the console, a hidden trace run (type "evals"), the logo
   * (click it five times), the Konami code and the printed page. Finds
   * are counted in this browser only, and the footer shows the count
   * once there is one. Nothing is sent anywhere.
   * ---------------------------------------------------------------- */
  const EGGS = ["evals", "logo", "konami", "print"];
  const found = new Set();
  try {
    JSON.parse(localStorage.getItem("eggs") || "[]").forEach((k) => { if (EGGS.indexOf(k) > -1) found.add(k); });
  } catch (e) { /* no storage: finds last this page */ }
  const eggCount = $("[data-eggs]");
  function showCount() {
    if (!eggCount || !found.size) return;
    eggCount.hidden = false;
    $("b", eggCount).textContent = String(found.size);
  }
  showCount();

  /* one toast at a time: another waits until this one has gone. In an
     open dialog it moves inside, so the dialog does not cover it */
  let toastEl = null;
  let toastTimer = 0;
  const toastQueue = [];
  function toast(label, text) {
    if (toastEl && toastEl.classList.contains("is-on")) {
      toastQueue.push([label, text]);
      return;
    }
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
    }
    const host = $("dialog[open]") || document.body;
    if (toastEl.parentNode !== host) host.appendChild(toastEl);
    toastEl.textContent = "";
    const l = document.createElement("span");
    const t = document.createElement("p");
    l.textContent = label;
    t.textContent = text;
    toastEl.appendChild(l);
    toastEl.appendChild(t);
    toastEl.classList.remove("is-on");
    void toastEl.offsetWidth;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("is-on");
      if (toastQueue.length) setTimeout(() => toast.apply(null, toastQueue.shift()), 400);
    }, toastQueue.length ? 4000 : 5500);
  }
  function find(key, text) {
    const again = found.has(key);
    found.add(key);
    try { localStorage.setItem("eggs", JSON.stringify(Array.from(found))); } catch (e) { /* see above */ }
    showCount();
    toast("Easter egg " + found.size + " / " + EGGS.length + (again ? " · found again" : ""), text);
    if (!again) document.dispatchEvent(new CustomEvent("egg-found", { detail: key }));
  }

  /* for whoever opens the console */
  if (window.console && console.log) {
    console.log(
      "%cJV.%c\n\nHi, curious one. You opened the console.\nThis site is hand-built: no framework, one scroll driver, a little AI.\nThere are four easter eggs on it. A hint for the first: type \"evals\" anywhere on the page.\n\n— João · joaosfvaz@gmail.com",
      "font: 800 28px sans-serif; color: #4d7cff",
      "font: 12px ui-monospace, monospace"
    );
  }

  /* flat confetti in the site's colours, once, then gone */
  function confetti() {
    if (reduced) return;
    const c = document.createElement("canvas");
    c.className = "confetti";
    c.setAttribute("aria-hidden", "true");
    document.body.appendChild(c);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth, h = window.innerHeight;
    c.width = w * dpr;
    c.height = h * dpr;
    const g = c.getContext("2d");
    g.scale(dpr, dpr);
    const cs = getComputedStyle(document.body);
    const colours = ["--accent", "--accent-2", "--ink"].map((n) => cs.getPropertyValue(n).trim());
    const bits = [];
    for (let i = 0; i < 140; i++) {
      bits.push({
        x: Math.random() * w, y: -20 - Math.random() * h * 0.5,
        vx: (Math.random() - 0.5) * 2.4, vy: 2 + Math.random() * 3.5,
        r: Math.random() * 6.3, vr: (Math.random() - 0.5) * 0.3,
        s: 6 + Math.random() * 6, c: colours[i % 3],
      });
    }
    const t0 = performance.now();
    (function step(now) {
      const t = now - t0;
      g.clearRect(0, 0, w, h);
      g.globalAlpha = Math.min(1, Math.max(0, (3200 - t) / 600));
      bits.forEach((b) => {
        b.x += b.vx; b.y += b.vy; b.vy += 0.035; b.r += b.vr;
        g.save(); g.translate(b.x, b.y); g.rotate(b.r);
        g.fillStyle = b.c; g.fillRect(-b.s / 2, -b.s / 2, b.s, b.s * 0.6);
        g.restore();
      });
      if (t < 3200) requestAnimationFrame(step);
      else c.remove();
    })(t0);
  }

  /* the curious view's game (js/game.js) shares the toasts, the confetti
     and the easter eggs */
  window.Home = { toast: toast, confetti: confetti, eggs: found, EGGS: EGGS };

  /* typing "evals", and the Konami code — never while typing in a field */
  const KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  let keys = [];
  let typed = "";
  document.addEventListener("keydown", (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.target.closest && ev.target.closest("input, textarea, select, [contenteditable]")) return;
    const k = (ev.key || "").toLowerCase();
    keys.push(k);
    if (keys.length > KONAMI.length) keys.shift();
    if (keys.join() === KONAMI.join()) {
      keys = [];
      confetti();
      find("konami", "↑↑↓↓←→←→BA. You clearly ship things for fun. Let's talk: joaosfvaz@gmail.com");
    }
    if (k.length === 1) {
      typed = (typed + k).slice(-5);
      if (typed === "evals") {
        typed = "";
        if (trace && S.inMode(trace)) {
          document.dispatchEvent(new CustomEvent("egg-evals"));
          find("evals", "A hidden fourth run: the agent was asked who built this site.");
        } else if (trace) {
          find("evals", "The hidden run plays in the AI section of the recruiter view.");
        } else {
          find("evals", "The hidden run plays in the AI section of the home page.");
        }
      }
    }
  });

  /* five quick clicks on the logo */
  const logo = $(".bar__name");
  if (logo) {
    let clicks = 0;
    let last = 0;
    logo.addEventListener("click", () => {
      const now = performance.now();
      clicks = now - last < 700 ? clicks + 1 : 1;
      last = now;
      if (clicks < 5) return;
      clicks = 0;
      logo.classList.remove("is-spun");
      void logo.offsetWidth;
      logo.classList.add("is-spun");
      find("logo", "Five clicks on a logo. You test things properly — a good sign.");
    });
  }

  /* the printed page is a clean CV (see @media print in home.css) */
  window.addEventListener("beforeprint", () => {
    find("print", "Printing? This page turns into a clean CV on paper.");
  });

  /* ------------------------------------------------------------------
   * Side quests — the personal side, in a full-screen dialog. Opening it
   * plays a short loading bar, then the cards land. Esc, the close
   * button or a link out close it; /#side-quests opens it on arrival,
   * which is how the project pages' controller button gets here.
   * ---------------------------------------------------------------- */
  const quests = $("#side-quests");
  const questsHere = S.mode === "curious" ? $("#quests") : null;
  if (questsHere) {
    /* the curious view: the side quests are on the page already */
    const goQuests = () => questsHere.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    $$("[data-quests-open]").forEach((b) => b.addEventListener("click", goQuests));
    if (location.hash === "#side-quests") {
      history.replaceState(null, "", location.pathname + "#quests");
      requestAnimationFrame(() => questsHere.scrollIntoView());
    }
  } else if (quests && quests.showModal) {
    $$(".quest", quests).forEach((q, i) => q.style.setProperty("--q", String(i)));
    const openQuests = () => {
      if (quests.open) return;
      quests.showModal();
      quests.scrollTop = 0;
      quests.classList.remove("is-playing");
      void quests.offsetWidth;
      quests.classList.add("is-playing");
      history.replaceState(null, "", "#side-quests");
    };
    $$("[data-quests-open]").forEach((b) => b.addEventListener("click", openQuests));
    $$("[data-quests-close]", quests).forEach((b) => b.addEventListener("click", () => quests.close()));
    quests.addEventListener("close", () => {
      if (location.hash === "#side-quests") history.replaceState(null, "", location.pathname);
    });
    if (location.hash === "#side-quests") openQuests();
  }

  /* the photo reels: each album is a native scroller with snapping, so
     a swipe, a trackpad and the keyboard all move it the same way. The
     arrows page through it; the count and the line under it say which
     photos are in view. Nothing here listens to scroll: an observer on
     the reel reports what is fully visible. */
  const pad2 = (n) => String(n).padStart(2, "0");
  $$("[data-reel]").forEach((row) => {
    const reel = $(".reel", row);
    const slides = $$(".reel__shot", reel);
    const prev = $('[data-reel-dir="-1"]', row);
    const next = $('[data-reel-dir="1"]', row);
    const count = $("[data-reel-count]", row);
    const line = $(".reel__line", row);
    const seen = new Set();
    if (!slides.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const i = slides.indexOf(e.target);
        if (e.intersectionRatio > 0.9) seen.add(i);
        else seen.delete(i);
      });
      if (!seen.size) return;
      const first = Math.min(...seen);
      const last = Math.max(...seen);
      count.textContent = (first === last ? pad2(first + 1) : pad2(first + 1) + "–" + pad2(last + 1)) + " / " + pad2(slides.length);
      prev.disabled = first === 0;
      next.disabled = last === slides.length - 1;
      row.classList.toggle("has-before", first > 0);
      row.classList.toggle("has-after", last < slides.length - 1);
      line.style.setProperty("--p", ((last + 1) / slides.length).toFixed(3));
    }, { root: reel, threshold: [0, 0.9, 1] });
    slides.forEach((sl) => io.observe(sl));
    const page = (dir) => reel.scrollBy({ left: dir * reel.clientWidth * 0.8, behavior: reduced ? "auto" : "smooth" });
    prev.addEventListener("click", () => page(-1));
    next.addEventListener("click", () => page(1));
  });

  /* the photo viewer: one album as a full-screen carousel. The track is
     a native scroller too, so a swipe follows the finger; the arrows, the
     arrow keys and the filmstrip move it, Esc or a click beside the photo
     closes. A large file loads only when its slide comes near. A photo
     outside the reels opens on its own, with no arrows and no filmstrip. */
  const lb = $("#lightbox");
  if (lb && lb.showModal && "IntersectionObserver" in window) {
    const track = $("[data-lb-track]", lb);
    const film = $("[data-lb-film]", lb);
    const lbCount = $("[data-lb-count]", lb);
    let list = [];
    let at = 0;
    let io = null;
    const load = (i) => {
      const img = track.children[i] && track.children[i].firstChild;
      if (img && !img.getAttribute("src")) img.src = img.dataset.src;
    };
    const mark = (i) => {
      at = i;
      [i - 1, i, i + 1].forEach(load);
      document.dispatchEvent(new CustomEvent("photo-seen", { detail: list[i].dataset.full }));
      lbCount.textContent = i + 1 + " / " + list.length;
      Array.prototype.forEach.call(film.children, (t, k) => {
        t.classList.toggle("is-on", k === i);
        if (k === i) t.setAttribute("aria-current", "true");
        else t.removeAttribute("aria-current");
      });
      const t = film.children[i];
      if (t) film.scrollTo({ left: t.offsetLeft - (film.clientWidth - t.offsetWidth) / 2, behavior: reduced ? "auto" : "smooth" });
    };
    const go = (i) => {
      const wrap = i < 0 || i >= list.length;
      i = (i + list.length) % list.length;
      /* past either end it wraps round, at once rather than rewinding */
      track.scrollTo({ left: i * track.clientWidth, behavior: reduced || wrap ? "auto" : "smooth" });
    };
    const build = (items) => {
      list = items;
      track.textContent = "";
      film.textContent = "";
      if (io) io.disconnect();
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) mark(Array.prototype.indexOf.call(track.children, e.target)); });
      }, { root: track, threshold: 0.6 });
      items.forEach((b, i) => {
        const thumb = $("img", b);
        const slide = document.createElement("figure");
        slide.className = "lightbox__slide";
        const img = document.createElement("img");
        img.alt = thumb.alt;
        img.decoding = "async";
        img.dataset.src = b.dataset.full;
        slide.appendChild(img);
        track.appendChild(slide);
        io.observe(slide);
        if (items.length < 2) return;
        const t = document.createElement("button");
        t.type = "button";
        t.className = "lightbox__thumb";
        t.setAttribute("aria-label", "Photo " + (i + 1) + " of " + items.length);
        const ti = document.createElement("img");
        ti.src = thumb.currentSrc || thumb.src;
        ti.alt = "";
        t.appendChild(ti);
        t.addEventListener("click", () => go(i));
        film.appendChild(t);
      });
      lb.classList.toggle("is-single", items.length < 2);
    };
    $$("[data-full]").forEach((b) => b.addEventListener("click", () => {
      const row = b.closest("[data-reel]");
      const items = row ? $$("[data-full]", row) : [b];
      if (items.length !== list.length || items[0] !== list[0]) build(items);
      const i = items.indexOf(b);
      lb.showModal();
      track.scrollLeft = i * track.clientWidth;
      mark(i);
    }));
    $("[data-lb-prev]", lb).addEventListener("click", () => go(at - 1));
    $("[data-lb-next]", lb).addEventListener("click", () => go(at + 1));
    $("[data-lb-close]", lb).addEventListener("click", () => lb.close());
    lb.addEventListener("keydown", (ev) => {
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
      ev.preventDefault();
      go(at + (ev.key === "ArrowLeft" ? -1 : 1));
    });
    track.addEventListener("click", (ev) => { if (ev.target.classList.contains("lightbox__slide")) lb.close(); });
  }

  /* ------------------------------------------------------------------
   * The question — a first visit asks who is visiting, like a game's
   * character select. "ask" (from the head script) opens it at once, and
   * only then: later visits change view with the switch. A choice goes to
   * /?mode=… behind a loading bar, so the page
   * starts over in that view and its intro plays where it can be seen,
   * and the choice holds even where storage is blocked. Skip or Esc on a
   * first visit means the recruiter view; later they only close it.
   * ---------------------------------------------------------------- */
  /* the hero switch: the thumb sits on this view */
  $$(".mode-switch").forEach((sw) => {
    sw.setAttribute("data-on", S.mode);
    $$("[data-mode-switch]", sw).forEach((a) => {
      if (a.dataset.modeSwitch === S.mode) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  });
  /* the switch, the footer link and "See the full CV" go straight to the
     other view: the switch slides its thumb across, the screen wipes up
     in that view's colour and the page starts over in it. The question
     itself only asks once, on a first visit */
  function switchTo(to, sw) {
    if (to === S.mode || root.hasAttribute("data-mode-switching")) return;
    root.setAttribute("data-mode-switching", "");
    const url = "/?mode=" + to + "&start=1";
    if (reduced) { location.replace(url); return; }
    if (sw) {
      sw.setAttribute("data-going", "");
      sw.setAttribute("data-on", to);
    }
    const wipe = document.createElement("div");
    wipe.className = "mode-wipe";
    wipe.setAttribute("data-to", to);
    document.body.appendChild(wipe);
    setTimeout(() => {
      void wipe.offsetWidth;
      wipe.classList.add("is-on");
      setTimeout(() => location.replace(url), 440);
    }, sw ? 380 : 0);
  }
  $$("[data-mode-switch]").forEach((a) => a.addEventListener("click", (ev) => {
    ev.preventDefault();
    switchTo(a.dataset.modeSwitch, a.closest(".mode-switch"));
  }));

  const ob = $("#onboard");
  if (ob && ob.showModal) {
    const picks = $$(".pick", ob);
    const boot = $("[data-boot]", ob);
    const loadLabel = $("[data-load-label]", ob);
    const loadPct = $("[data-load-pct]", ob);
    let going = false;
    let pending = "";
    let bootTimers = [];

    const hover = (p) => {
      picks.forEach((x) => x.classList.toggle("is-on", x === p));
      ob.setAttribute("data-hover", p ? p.dataset.pick : "");
    };
    const pickFor = (mode) => picks.filter((p) => p.dataset.pick === mode)[0];

    /* the console line types out the boot, then says it is ready */
    function runBoot() {
      bootTimers.forEach(clearTimeout);
      if (reduced) { boot.textContent = "Ready"; return; }
      bootTimers = ["Booting joao-vaz.com", "Loading player data", "2 paths found", "Ready"].map((t, i) =>
        setTimeout(() => { boot.textContent = t; }, i * 340));
    }

    function open() {
      ob.showModal();
      ob.classList.add("is-playing");
      picks[0].focus({ preventScroll: true });
      hover(picks[0]);
      runBoot();
    }

    /* a choice: the card steps forward, the bar loads, the screen wipes
       and the page starts over in that view */
    function choose(mode) {
      if (going) return;
      going = true;
      const p = pickFor(mode);
      hover(p);
      picks.forEach((x) => x.classList.toggle(x === p ? "is-chosen" : "is-out", true));
      ob.classList.add("is-picked");
      ob.setAttribute("data-picked", mode);
      loadLabel.textContent = "Loading the " + mode + " view";
      const url = "/?mode=" + mode + "&start=1";
      pending = url;
      if (reduced) { location.replace(url); return; }
      const t0 = performance.now();
      (function tick(now) {
        const k = clamp((now - t0) / 950, 0, 1);
        const v = Math.round(100 * S.easeOutCubic(k));
        loadPct.textContent = v + "%";
        ob.style.setProperty("--load", (v / 100).toFixed(3));
        if (k < 1) { requestAnimationFrame(tick); return; }
        ob.classList.add("is-leaving");
        setTimeout(() => location.replace(url), 420);
      })(t0);
    }

    const skip = () => choose("recruiter");

    picks.forEach((p) => {
      /* the pointer and the keys move one selection, never two */
      p.addEventListener("pointerenter", () => {
        if (going) return;
        p.focus({ preventScroll: true });
        hover(p);
      });
      p.addEventListener("focus", () => hover(p));
      p.addEventListener("click", () => choose(p.dataset.pick));
    });
    /* on a mouse, the cards lean towards the pointer */
    if (!reduced && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      picks.forEach((p) => {
        p.addEventListener("pointermove", (ev) => {
          const r = p.getBoundingClientRect();
          p.style.setProperty("--rx", (((ev.clientY - r.top) / r.height - 0.5) * -7).toFixed(2) + "deg");
          p.style.setProperty("--ry", (((ev.clientX - r.left) / r.width - 0.5) * 9).toFixed(2) + "deg");
        });
        p.addEventListener("pointerleave", () => {
          p.style.removeProperty("--rx");
          p.style.removeProperty("--ry");
        });
      });
    }
    ob.addEventListener("keydown", (ev) => {
      if (going) return;
      const i = picks.indexOf(document.activeElement);
      if (ev.key === "ArrowRight" || ev.key === "ArrowDown") {
        ev.preventDefault();
        picks[(i + 1) % picks.length].focus();
      } else if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") {
        ev.preventDefault();
        picks[(i + picks.length - 1) % picks.length].focus();
      } else if (ev.key === "1" || ev.key === "2") {
        ev.preventDefault();
        choose(picks[Number(ev.key) - 1].dataset.pick);
      }
    });
    $("[data-onboard-skip]", ob).addEventListener("click", skip);
    ob.addEventListener("cancel", (ev) => { ev.preventDefault(); skip(); });
    /* before the visitor has clicked anything, a browser may let Esc
       close the dialog outright instead of asking: finish the choice at
       once (a first visit with no choice yet means the recruiter view) */
    ob.addEventListener("close", () => location.replace(pending || "/?mode=recruiter&start=1"));

    if (root.getAttribute("data-mode") === "ask") {
      open();
      /* the page behind may show now: the dialog covers it */
      root.setAttribute("data-mode", "asking");
    }
  }

  /* arriving from the question: say which view this is, once the intro
     has landed */
  if (root.hasAttribute("data-mode-new")) {
    setTimeout(() => {
      if (S.mode === "curious") toast("Curious view", "Side quests first, then the day job. The full CV is one switch away, at the top of the page.");
      else toast("Recruiter view", "The full CV: products, AI and experience. Switch views any time at the top of the page.");
    }, reduced ? 0 : 1900);
  }

  /* in-page links glide; the target keeps its own scroll padding */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (ev) => {
      const id = a.getAttribute("href").slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      ev.preventDefault();
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", "#" + id);
    });
  });

  /* metrics shift when the webfonts swap in; the first measure also
     lands whatever is already on screen */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => S.measure());
  S.measure();
})();

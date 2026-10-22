/* ------------------------------------------------------------------ *
 *  Home page — reveals, word-by-word headings, the hero (name, photo,
 *  dot field, scroll depth), counters, the word strip, the accordions,
 *  the playable trace, the copy button and the navigation (bar, section
 *  index, dock).
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
   * The name — split into characters that rise out of their lines.
   * The index runs on across both lines, so "Vaz" follows "João".
   * ---------------------------------------------------------------- */
  let charIndex = 0;
  $$("[data-split]").forEach((el) => {
    const text = el.textContent;
    el.textContent = "";
    for (const c of text) {
      const s = document.createElement("span");
      s.className = "ch";
      s.textContent = c;
      s.style.setProperty("--d", String(charIndex++));
      el.appendChild(s);
    }
  });
  requestAnimationFrame(() => $$(".hero__name .line").forEach((l) => l.classList.add("is-lit")));

  /* ------------------------------------------------------------------
   * Headings — every word goes into its own mask, so a heading rises
   * word by word when it reveals. Words inside an <em> stay inside it
   * and keep its colour. The text itself is unchanged.
   * ---------------------------------------------------------------- */
  $$(".head h2, .contact__title").forEach((h) => {
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

  /* ------------------------------------------------------------------
   * Reveals — driven by position, not IntersectionObserver: a deep link
   * or a fast flick cannot skip one. Each element is indexed among its
   * revealing siblings, so a group lands as a run of beats.
   * ---------------------------------------------------------------- */
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
    count($("[data-count]", el));
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
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.fill();
      /* lit dots turn blue: full blue under the pointer, a lighter blue
         in a ripple */
      for (let i = 0; i < lit.length; i++) {
        const d = lit[i];
        const rgb = d.r ? "169, 188, 255" : "77, 124, 255";
        ctx.fillStyle = "rgba(" + rgb + ", " + (0.25 + d.v * 0.75 * d.f).toFixed(3) + ")";
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
        ["mandate · assist · read-only ✓", "2 ms", 40, 6, "is-check"],
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
        ["mandate · one-click · changes data", "3 ms", 31, 5, "is-check"],
        ["human · the dealer confirms the price", "4.2 s", 37, 32, "is-human"],
        ["tool · update_price(car) · revert supported", "264 ms", 70, 14, "is-tool"],
        ["answer · change made, undo offered", "0.9 s", 85, 15, ""],
      ],
      a: "Done — your Golf is now listed at €18,400, the market price for its specs. You can undo this change.",
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
  const rail = $(".rail");
  const navLinks = $$("[data-nav]");
  const ids = ["products", "ai", "work", "projects", "contact"];
  const railFills = {};
  $$(".rail a").forEach((a) => { railFills[a.dataset.nav] = $("i", a); });
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
    if (st.y >= st.max - 4) next = "contact";
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
    const first = S.anchors.products;
    if (rail) rail.classList.toggle("is-hidden", st.y < (first ? first.top - st.vh * 0.4 : st.vh * 0.5));
  }
  S.onScroll(sync);
  S.onMeasure((st) => sync(st));

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

/* ------------------------------------------------------------------ *
 *  Motion layer — reveals, character splits, counters, the marquee,
 *  the hero glass, magnetic buttons and the scroll-told timeline.
 *
 *  Two rules hold this file together:
 *
 *  1. Fail open. The document is written in its finished state; the
 *     `.js` class on <html> is the only thing that hides anything. Any
 *     element this file forgets stays readable instead of blank.
 *  2. One clock. Every scroll-driven effect subscribes to
 *     window.Scroll (js/scroll.js). Nothing here binds its own
 *     scroll listener.
 * ------------------------------------------------------------------ */
(function () {
  "use strict";

  const S = window.Scroll;
  const reduced = S.reduced;
  const clamp = S.clamp;
  const root = document.documentElement;

  /* ------------------------------------------------------------------
   * Character split
   * Splits a line into per-character spans so the heading rises letter
   * by letter. Runs before anything paints; the mask in CSS hides the
   * characters until their line is lit.
   * ---------------------------------------------------------------- */
  function split(el) {
    const text = el.textContent;
    const frag = document.createDocumentFragment();
    let i = 0;
    /* characters sit inside a word that will not break, so a narrow
       screen wraps between words and never in the middle of one */
    let word = null;
    for (const ch of text) {
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = ch;
      span.style.setProperty("--d", String(i));
      if (/\s/.test(ch)) {
        word = null;
        frag.appendChild(span);
      } else {
        if (!word) {
          word = document.createElement("span");
          word.className = "word";
          frag.appendChild(word);
        }
        word.appendChild(span);
      }
      i++;
    }
    el.textContent = "";
    el.appendChild(frag);
    /* the whole line keeps its text for assistive tech */
    el.setAttribute("aria-label", text);
    return i;
  }

  const splitLines = Array.prototype.slice.call(document.querySelectorAll("[data-split]"));
  splitLines.forEach((el) => split(el));

  /* The heading itself carries the accessible name. `aria-label` on the
     role-less wrapper span is not reliably exposed, and without a name
     on the heading a screen reader can fall back to reading the split
     characters one at a time. */
  document.querySelectorAll("h1, h2").forEach((h) => {
    const lines = Array.prototype.slice.call(h.querySelectorAll("[data-split]"));
    if (!lines.length) return;
    h.setAttribute("aria-label", lines.map((l) => l.getAttribute("aria-label")).join(" "));
  });

  /* The page's own title is lit on load; every other split heading waits
     for the reading position to reach it. */
  function light(el, base) {
    if (el.classList.contains("is-lit")) return;
    el.style.setProperty("--base", (base || 0) + "ms");
    el.classList.add("is-lit");
  }
  const titleLines = Array.prototype.slice.call(document.querySelectorAll("h1 [data-split]"));
  titleLines.forEach((el, i) => light(el, 150 + i * 90));

  /* ------------------------------------------------------------------
   * Reveal on scroll
   * Driven by the scroll driver rather than IntersectionObserver: an
   * anchor jump or a fast flick can move an element from below the
   * viewport to above it without ever crossing a visibility threshold,
   * which used to leave copy sitting at opacity 0 for good. A position
   * test on every frame cannot miss that.
   * ---------------------------------------------------------------- */
  const revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  /* index each element among its revealing siblings, so a group lands
     as a run of beats instead of one block */
  const seen = new Map();
  revealEls.forEach((el) => {
    const parent = el.parentElement;
    const n = seen.get(parent) || 0;
    seen.set(parent, n + 1);
    el.style.setProperty("--i", String(Math.min(n, 6)));
  });

  /* groups whose children land one after another */
  const staggerGroups = Array.prototype.slice.call(document.querySelectorAll("[data-stagger]"));
  staggerGroups.forEach((group) => {
    Array.prototype.slice.call(group.children).forEach((child, i) => {
      child.style.setProperty("--d", String(i));
    });
  });

  /* everything that waits for the reading position to reach it */
  const laterLines = splitLines.filter((el) => titleLines.indexOf(el) === -1);
  const watched = revealEls.concat(staggerGroups).concat(laterLines);

  /* An animation that fills forwards keeps its transform — as an
     identity matrix, but a transform all the same, and a transformed
     ancestor becomes the containing block for `.tl__meta`'s sticky
     dates. So each reveal drops its animation the moment it ends. */
  function settle(el) {
    el.addEventListener(
      "animationend",
      (ev) => {
        if (ev.target !== el) return; /* a child's animation, not ours */
        el.classList.add("is-instant");
      },
      { once: true }
    );
  }

  function enter(el, instant) {
    el.classList.add("is-in");
    if (instant) el.classList.add("is-instant");
    else settle(el);
    if (el.hasAttribute("data-split")) light(el, 0);
  }

  /* Same reason, for the staggered chips: while their animation fills,
     it outranks the hover transform, and the chips stop lifting. The
     group drops the animation once its last child has landed. */
  staggerGroups.forEach((group) => {
    const total = group.children.length;
    let landed = 0;
    group.addEventListener("animationend", (ev) => {
      if (ev.target.parentElement !== group) return;
      landed++;
      if (landed >= total) group.classList.add("is-instant");
    });
  });

  function showAll(instant) {
    watched.forEach((el) => enter(el, instant));
  }

  if (reduced) {
    showAll(true);
  } else {
    let marks = [];
    S.onMeasure(() => {
      const done = new Map(marks.map((m) => [m.el, m.done]));
      marks = watched.map((el) => {
        const r = el.getBoundingClientRect();
        const top = r.top + window.scrollY;
        return { el: el, top: top, bottom: top + r.height, done: done.get(el) === true };
      });
    });
    S.onScroll((st) => {
      for (let i = 0; i < marks.length; i++) {
        const m = marks[i];
        if (m.done) continue;
        if (m.bottom < st.y) {
          /* scrolled clean past it — show it settled, do not replay */
          m.done = true;
          enter(m.el, true);
        } else if (m.top < st.y + st.vh * 0.9) {
          m.done = true;
          enter(m.el, false);
        }
      }
    });
    /* last resort: whatever is still hidden three seconds after load is
       a bug in the lines above, and a blank block is worse than a
       skipped animation. */
    window.addEventListener("load", () => {
      setTimeout(() => {
        marks.forEach((m) => {
          if (m.done || m.top > window.scrollY + window.innerHeight) return;
          m.done = true;
          enter(m.el, true);
        });
      }, 3000);
    });
  }

  /* ------------------------------------------------------------------
   * Marquee
   * The track is duplicated once and translated by exactly half its
   * width, so the loop is seamless at any content length, and the
   * duration is derived from the width to keep the speed constant.
   * ---------------------------------------------------------------- */
  if (!reduced) document.querySelectorAll("[data-marquee]").forEach((track) => {
    const copy = track.cloneNode(true);
    copy.removeAttribute("data-marquee");
    copy.setAttribute("aria-hidden", "true");
    while (copy.firstChild) track.appendChild(copy.firstChild);
    const half = track.scrollWidth / 2;
    track.style.setProperty("--half", half + "px");
    track.style.setProperty("--dur", Math.max(18, half / 55).toFixed(1) + "s");
  });

  /* ------------------------------------------------------------------
   * Nav labels — each rides in a mask and swaps for its own copy
   * ---------------------------------------------------------------- */
  document.querySelectorAll(".nav__links a:not(.nav__cta) span").forEach((span) => {
    const label = span.textContent;
    span.textContent = "";
    /* the copy that rides in is a real element marked hidden, so the
       link is never announced twice */
    const base = document.createElement("i");
    const hover = document.createElement("i");
    base.className = "nav__label";
    hover.className = "nav__label nav__label--hover";
    hover.setAttribute("aria-hidden", "true");
    base.textContent = label;
    hover.textContent = label;
    span.appendChild(base);
    span.appendChild(hover);
  });

  /* ------------------------------------------------------------------
   * Counters — one shot, never scrubbed. The finished value is already
   * in the markup; this animates up to it.
   * ---------------------------------------------------------------- */
  const counters = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));
  const finalValue = (el) =>
    (el.dataset.prefix || "") + (el.dataset.count || "") + (el.dataset.suffix || "");

  function animateCount(el) {
    const target = parseFloat(el.dataset.count || "0");
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const dur = 1300;
    let start = null;
    const step = (ts) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      el.textContent = prefix + Math.round(S.easeOutCubic(p) * target) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = finalValue(el);
    };
    requestAnimationFrame(step);
  }

  if (!reduced) {
    let marks = [];
    S.onMeasure(() => {
      const done = new Map(marks.map((m) => [m.el, m.done]));
      marks = counters.map((el) => ({
        el: el,
        top: el.getBoundingClientRect().top + window.scrollY,
        done: done.get(el) === true,
      }));
    });
    S.onScroll((st) => {
      for (let i = 0; i < marks.length; i++) {
        const m = marks[i];
        if (m.done) continue;
        if (m.top < st.y) {
          m.done = true; /* scrolled past — it already reads right */
        } else if (m.top < st.y + st.vh * 0.86) {
          m.done = true;
          animateCount(m.el);
        }
      }
    });
  }

  /* ------------------------------------------------------------------
   * Nav state + scroll progress
   * ---------------------------------------------------------------- */
  const nav = document.getElementById("nav");
  const progress = document.getElementById("scrollProgress");
  S.onScroll((st) => {
    if (nav) nav.classList.toggle("is-scrolled", st.y > 40);
    if (progress) progress.style.transform = "scaleX(" + st.progress.toFixed(4) + ")";
  });

  /* ------------------------------------------------------------------
   * Smooth anchor navigation
   * The global CSS `scroll-behavior: smooth` stays off: it desyncs
   * every scroll-driven effect from the input. Anchors smooth here.
   * ---------------------------------------------------------------- */
  /* the hero CTA's fallback href is for the no-script page only */
  document.querySelectorAll('a[href^="#"]:not([data-cta-open])').forEach((a) => {
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
   * Hero — the copy lifts away as the page scrolls. The glass behind it
   * is js/scene.js.
   * ---------------------------------------------------------------- */
  const heroInner = document.querySelector(".hero__inner");
  if (!reduced && heroInner) {
    S.onFrame((st) => {
      const p = clamp(st.y / (st.vh * 0.95), 0, 1);
      const e = S.smoothstep(p);
      if (heroInner) {
        heroInner.style.transform = "translate3d(0," + (e * -64).toFixed(1) + "px,0)";
        heroInner.style.opacity = (1 - e).toFixed(3);
      }
    });
  }

  /* ------------------------------------------------------------------
   * Hero call to action
   * "Get in touch" opens into a pill that types the address in; the
   * arrow copies it, the pill confirms, and four seconds later the
   * button comes back. Without this script the button is a link to the
   * contact section.
   * ---------------------------------------------------------------- */
  const cta = document.querySelector("[data-cta]");
  if (cta) {
    const email = cta.dataset.email;
    const openBtn = cta.querySelector("[data-cta-open]");
    const pill = cta.querySelector("[data-cta-pill]");
    const text = cta.querySelector("[data-cta-text]");
    const copyBtn = cta.querySelector("[data-cta-copy]");
    const status = cta.querySelector("[data-cta-status]");
    const STEP = 60;
    const HOLD = 4000;
    let typing = null;
    let resetTimer = null;

    const type = (message) => {
      clearInterval(typing);
      status.textContent = message;
      if (reduced) {
        text.textContent = message;
        return;
      }
      let i = 0;
      text.textContent = "";
      typing = setInterval(() => {
        i++;
        text.textContent = message.slice(0, i);
        if (i >= message.length) clearInterval(typing);
      }, STEP);
    };

    /* out, then in — the two states never overlap */
    const swap = (from, to, after) => {
      const show = () => {
        from.hidden = true;
        from.classList.remove("cta-out");
        to.hidden = false;
        to.classList.remove("cta-in");
        void to.offsetWidth;
        to.classList.add("cta-in");
        if (after) after();
      };
      if (reduced) return show();
      from.classList.add("cta-out");
      setTimeout(show, 200);
    };

    openBtn.addEventListener("click", (e) => {
      e.preventDefault();
      swap(openBtn, pill, () => {
        type(email);
        copyBtn.focus({ preventScroll: true });
      });
    });

    copyBtn.addEventListener("click", () => {
      if (cta.classList.contains("is-done")) return;
      const done = (message) => {
        cta.classList.add("is-done");
        copyBtn.setAttribute("aria-label", "Copied");
        type(message);
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          swap(pill, openBtn, () => {
            clearInterval(typing);
            text.textContent = "";
            status.textContent = "";
            cta.classList.remove("is-done");
            copyBtn.setAttribute("aria-label", "Copy the email address");
          });
        }, HOLD);
      };
      const copy = navigator.clipboard && window.isSecureContext
        ? navigator.clipboard.writeText(email)
        : Promise.reject();
      copy.then(
        () => done("Copied — talk soon"),
        () => {
          /* no clipboard access: leave the address selected to copy by hand */
          clearInterval(typing);
          text.textContent = email;
          const range = document.createRange();
          range.selectNodeContents(text);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          status.textContent = "Address selected — copy it from the field";
        }
      );
    });
  }

  /* ------------------------------------------------------------------
   * Experience — the spine draws as you read, and the entry under the
   * reading line lights up
   * ---------------------------------------------------------------- */
  const timeline = document.querySelector(".timeline");
  const items = Array.prototype.slice.call(document.querySelectorAll(".tl"));
  if (timeline && items.length) {
    if (reduced) {
      timeline.style.setProperty("--tl-fill", "1");
      items.forEach((li) => li.classList.add("is-active"));
    } else {
      timeline.style.setProperty("--tl-fill", "0");
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
   * Magnetic buttons — the control leans towards the pointer and
   * springs back when it leaves
   * ---------------------------------------------------------------- */
  if (!reduced && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const pull = 0.28;
      el.addEventListener("pointermove", (ev) => {
        const r = el.getBoundingClientRect();
        const dx = (ev.clientX - (r.left + r.width / 2)) * pull;
        const dy = (ev.clientY - (r.top + r.height / 2)) * pull;
        el.style.transition = "none";
        el.style.transform = "translate3d(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px,0)";
      });
      el.addEventListener("pointerleave", () => {
        el.style.transition = "transform 0.5s var(--spring)";
        el.style.transform = "";
      });
    });
  }

  /* ------------------------------------------------------------------
   * Active nav link
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

  /* metrics shift when the webfonts swap in */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => S.measure());
  }

  root.classList.add("is-ready");
})();

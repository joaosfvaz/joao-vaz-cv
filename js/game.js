/* ------------------------------------------------------------------ *
 *  The game — the curious view only, and quiet on purpose. Exploring
 *  the page earns XP: reaching the side quests, reading every quest
 *  card, every photo in the viewer, the chess puzzle, a side project,
 *  the end of the page and the four easter eggs. XP makes a level. The
 *  controller in the bar opens the quest log and, once there is any XP,
 *  carries the level and a small XP bar. A toast speaks only for an
 *  achievement or a level, and the first step and the end stay quiet;
 *  the confetti plays once, at the top level.
 *
 *  Progress stays in this browser (localStorage "game", and "eggs" from
 *  js/home.js); the time of this visit is in sessionStorage. Nothing is
 *  sent anywhere. The recruiter view loads this file and leaves at once.
 * ------------------------------------------------------------------ */
(function () {
  "use strict";

  const S = window.Scroll;
  const H = window.Home;
  if (!S || !H || S.mode !== "curious") return;
  const reduced = S.reduced;
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.prototype.slice.call((el || document).querySelectorAll(sel));

  /* Facts only João can give: one line for the back of each quest card,
     in page order, and the place of each landscape photo, by file. While
     a list is empty its game stays off — no flip, no guessing. */
  const CARD_BACKS = [];
  const PLACES = {};

  const inline = $("[data-quests-inline]");
  const cards = inline ? $$(".quest", inline) : [];
  const photos = inline ? $$("[data-full]", inline).map((b) => b.dataset.full) : [];
  const placeKeys = Object.keys(PLACES).filter((k) => photos.indexOf(k) > -1);
  const placesOn = new Set(placeKeys.map((k) => PLACES[k])).size >= 3 && placeKeys.length >= 5;

  /* ---------- the progress store ---------- */
  let st = {};
  try { st = JSON.parse(localStorage.getItem("game") || "{}") || {}; } catch (e) { /* no storage: this page only */ }
  const got = new Set(st.got || []);
  const read = new Set(st.read || []);
  const seen = new Set(st.seen || []);
  const guessed = new Set(st.guessed || []);
  let pending = st.pending || [];
  const save = () => {
    try {
      localStorage.setItem("game", JSON.stringify({
        got: Array.from(got), read: Array.from(read), seen: Array.from(seen),
        guessed: Array.from(guessed), pending: pending,
      }));
    } catch (e) { /* see above */ }
  };
  let t0 = Date.now();
  try {
    t0 = Number(sessionStorage.getItem("run-t0")) || t0;
    sessionStorage.setItem("run-t0", String(t0));
  } catch (e) { /* this page only */ }

  /* ---------- achievements, XP and levels ---------- */
  const ACH = [
    { key: "quests", xp: 50, name: "Side quests", hint: "Scroll down to the side quests.", done: "You found the fun part.", quiet: true },
    { key: "cards", xp: 100, name: "Quest board", hint: "Read every quest card.", done: "You read every quest card.", of: () => [read.size, cards.length] },
    { key: "photos", xp: 150, name: "Photo collector", hint: "Open every photo in the viewer.", done: "You saw every photo.", of: () => [seen.size, photos.length] },
    { key: "chess", xp: 200, name: "Checkmate", hint: "Solve the puzzle on the chess card.", done: "Mate in two, as Morphy played it in 1858." },
    { key: "places", xp: 100, name: "Globetrotter", hint: "Guess where 5 landscape photos were taken.", done: "You placed 5 photos on the map.", of: () => [Math.min(guessed.size, 5), 5], off: !placesOn },
    { key: "build", xp: 100, name: "Builder", hint: "Open one of the things I built.", done: "You looked at something I built." },
    { key: "contact", xp: 100, name: "Run complete", hint: "Reach the end of the page.", done: "You reached the end.", quiet: true },
  ].filter((a) => !a.off);
  const EGG_XP = 50;
  const byKey = {};
  ACH.forEach((a) => { byKey[a.key] = a; });
  const LEVELS = [[0, "Visitor"], [150, "Explorer"], [400, "Regular"], [700, "Insider"]];

  const xp = () => ACH.reduce((n, a) => n + (got.has(a.key) ? a.xp : 0), 0) + H.eggs.size * EGG_XP;
  function level(x) {
    let i = 0;
    while (i < LEVELS.length - 1 && x >= LEVELS[i + 1][0]) i++;
    const from = LEVELS[i][0];
    const to = i < LEVELS.length - 1 ? LEVELS[i + 1][0] : from;
    return { i: i, n: i + 1, name: LEVELS[i][1], top: i === LEVELS.length - 1, k: to > from ? (x - from) / (to - from) : 1, to: to };
  }

  /* ---------- the controller in the bar ---------- */
  const hudBtns = $$(".xp");
  function hud() {
    const x = xp();
    const L = level(x);
    hudBtns.forEach((b) => {
      b.classList.toggle("has-xp", x > 0);
      $(".xp__lv", b).textContent = String(L.n);
      b.style.setProperty("--xp", L.k.toFixed(3));
      b.setAttribute("aria-label", x > 0 ? "Quest log — level " + L.n + ", " + x + " XP" : "Quest log");
    });
    run();
    if (qlog && qlog.open) renderLog();
  }

  /* a level the visitor has not been told about yet */
  let told = level(xp()).i;
  function levelUp() {
    const L = level(xp());
    if (L.i <= told) return null;
    told = L.i;
    if (L.top && !got.has("top")) {
      got.add("top");
      save();
      setTimeout(H.confetti, 600);
    }
    return L;
  }
  function announce(a) {
    const L = levelUp();
    const first = Array.from(got).filter((k) => byKey[k] && !byKey[k].quiet).length === 1;
    H.toast(
      a.name + " · +" + a.xp + " XP" + (L ? " · Level " + L.n : ""),
      a.done + (first ? " Your quest log is the controller in the top bar." : "")
    );
    if (L && L.top) H.toast("Top level · " + L.name, "You saw nearly everything here. Say hi, and tell me how you did it.");
  }
  /* an achievement; "later" keeps the toast for the next visit, for a
     link that leaves the page. A quiet one (the first step, and the end,
     where the run card speaks) only says so if it reaches the top level */
  function earn(key, later) {
    const a = byKey[key];
    if (!a || got.has(key)) return;
    got.add(key);
    if (later) pending.push(key);
    save();
    if (a.quiet) {
      const L = levelUp();
      if (L && L.top) H.toast("Top level · " + L.name, "You saw nearly everything here. Say hi, and tell me how you did it.");
    } else if (!later) announce(a);
    hud();
  }
  document.addEventListener("egg-found", () => {
    const L = levelUp();
    if (L) H.toast("Level " + L.n + " · " + L.name, L.top ? "You saw nearly everything here. Say hi, and tell me how you did it." : "Easter eggs count too. See the quest log for the rest.");
    hud();
  });

  /* a click beside a panel, on its backdrop, closes it */
  function outside(d) {
    d.addEventListener("click", (ev) => {
      if (ev.target !== d) return;
      const r = d.getBoundingClientRect();
      if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) d.close();
    });
  }

  /* ---------- the quest log ---------- */
  const qlog = $("#qlog");
  function row(a, done, of, xpText) {
    const li = document.createElement("li");
    li.className = "qrow" + (done ? " is-done" : "");
    const mark = document.createElement("i");
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = done ? "✓" : "";
    const body = document.createElement("div");
    const b = document.createElement("b");
    b.textContent = a.name;
    const s = document.createElement("span");
    s.textContent = done ? a.done : a.hint;
    body.appendChild(b);
    body.appendChild(s);
    const side = document.createElement("span");
    side.className = "qrow__side";
    side.textContent = (of && !done ? of[0] + " / " + of[1] + " · " : "") + xpText;
    li.appendChild(mark);
    li.appendChild(body);
    li.appendChild(side);
    if (done) li.setAttribute("aria-label", a.name + ", done");
    return li;
  }
  function renderLog() {
    const x = xp();
    const L = level(x);
    $("[data-qlog-level]", qlog).textContent = "Level " + L.n;
    $("[data-qlog-name]", qlog).textContent = L.name;
    $("[data-qlog-fill]", qlog).style.setProperty("--k", L.k.toFixed(3));
    $("[data-qlog-xp]", qlog).textContent = L.top ? x + " XP · top level" : x + " / " + L.to + " XP";
    const list = $("[data-qlog-list]", qlog);
    list.textContent = "";
    ACH.forEach((a) => list.appendChild(row(a, got.has(a.key), a.of && a.of(), "+" + a.xp)));
    const eggs = { name: "Easter eggs", hint: "Four are hidden. Some need a keyboard, one needs a printer.", done: "You found all four." };
    list.appendChild(row(eggs, H.eggs.size >= H.EGGS.length, [H.eggs.size, H.EGGS.length], "+" + EGG_XP + " each"));
  }
  if (qlog && qlog.showModal) {
    $$("[data-qlog-open]").forEach((b) => b.addEventListener("click", () => {
      renderLog();
      qlog.showModal();
    }));
    $("[data-qlog-close]", qlog).addEventListener("click", () => qlog.close());
    outside(qlog);
  }

  /* ---------- the run card at the end ---------- */
  const card = $("[data-runcard]");
  function run() {
    if (!card) return;
    const x = xp();
    const L = level(x);
    const done = ACH.filter((a) => got.has(a.key)).length;
    const set = (k, v) => { $('[data-run="' + k + '"]', card).textContent = v; };
    set("level", L.n + " · " + L.name);
    set("xp", String(x));
    set("ach", done + " / " + ACH.length);
    set("photos", seen.size + " / " + photos.length);
    set("eggs", H.eggs.size + " / " + H.EGGS.length);
    /* the time only once it says something */
    const min = Math.floor((Date.now() - t0) / 60000);
    $("[data-run-time]", card).hidden = min < 1;
    set("time", min + " min");
    $("[data-run-mail]", card).href = "mailto:joaosfvaz@gmail.com?subject=" +
      encodeURIComponent("My run on joao-vaz.com: level " + L.n + ", " + x + " XP");
  }

  /* ---------- reaching places on the page ---------- */
  function onReach(el, margin, fn) {
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      fn();
    }, { rootMargin: margin });
    io.observe(el);
  }
  onReach($("#quests"), "0px 0px -45% 0px", () => earn("quests"));
  onReach($("#contact"), "0px 0px -25% 0px", () => {
    if (card) {
      card.hidden = false;
      run();
      requestAnimationFrame(() => card.classList.add("is-in"));
    }
    earn("contact");
  });

  /* a card counts as read once most of it has been in view for a second */
  if (cards.length && "IntersectionObserver" in window && !got.has("cards")) {
    const timers = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const k = $("h4", e.target).textContent;
        if (e.isIntersecting) {
          if (!timers.has(k)) timers.set(k, setTimeout(() => {
            read.add(k);
            save();
            io.unobserve(e.target);
            if (read.size >= cards.length) earn("cards");
            else hud();
          }, 1000));
        } else {
          clearTimeout(timers.get(k));
          timers.delete(k);
        }
      });
    }, { threshold: 0.6 });
    cards.forEach((c) => { if (!read.has($("h4", c).textContent)) io.observe(c); });
  }

  /* every photo shown in the viewer is collected */
  const lbGot = $("[data-lb-got]");
  const showGot = () => { if (lbGot) lbGot.textContent = seen.size + " / " + photos.length + " collected"; };
  document.addEventListener("photo-seen", (ev) => {
    const k = ev.detail;
    if (photos.indexOf(k) < 0) return;
    if (!seen.has(k)) {
      seen.add(k);
      save();
      if (seen.size >= photos.length) earn("photos");
      else hud();
    }
    showGot();
    quiz(k);
  });

  /* a side project: the toast waits for the way back */
  $$('a[href="/tabiya/"], a[href="/pm-os/"], a[href="/team-context/"]').forEach((a) => {
    a.addEventListener("click", () => earn("build", true));
  });

  /* ---------- where was this taken (needs PLACES) ---------- */
  const quizEl = $("[data-lb-quiz]");
  function quiz(k) {
    if (!quizEl) return;
    quizEl.hidden = !placesOn || !PLACES[k];
    if (quizEl.hidden) return;
    quizEl.textContent = "";
    const q = document.createElement("span");
    q.className = "meta";
    const answer = PLACES[k];
    if (guessed.has(k)) {
      q.textContent = "Taken in " + answer;
      quizEl.appendChild(q);
      return;
    }
    q.textContent = "Where was this taken?";
    quizEl.appendChild(q);
    const others = Array.from(new Set(placeKeys.map((p) => PLACES[p]))).filter((p) => p !== answer);
    others.sort(() => Math.random() - 0.5);
    const options = [answer, others[0], others[1]].sort(() => Math.random() - 0.5);
    options.forEach((o) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn--line btn--sm";
      b.textContent = o;
      b.addEventListener("click", () => {
        const right = o === answer;
        q.textContent = right ? "Yes: " + answer : "No: it is " + answer;
        $$("button", quizEl).forEach((x) => {
          x.disabled = true;
          x.classList.toggle("is-right", x.textContent === answer);
        });
        if (right) {
          guessed.add(k);
          save();
          if (guessed.size >= 5) earn("places");
          else hud();
        }
      });
      quizEl.appendChild(b);
    });
  }

  /* ---------- quest cards that turn over (needs CARD_BACKS) ---------- */
  cards.forEach((c, i) => {
    const text = CARD_BACKS[i];
    if (!text) return;
    c.classList.add("quest--flip");
    const back = document.createElement("div");
    back.className = "quest__back";
    const m = document.createElement("p");
    m.className = "meta";
    m.textContent = $("h4", c).textContent;
    const p = document.createElement("p");
    p.textContent = text;
    back.appendChild(m);
    back.appendChild(p);
    c.appendChild(back);
    const turn = document.createElement("button");
    turn.type = "button";
    turn.className = "quest__turn";
    turn.setAttribute("aria-pressed", "false");
    turn.textContent = "Turn over";
    c.appendChild(turn);
    turn.addEventListener("click", () => {
      const on = !c.classList.contains("is-flipped");
      turn.setAttribute("aria-pressed", String(on));
      turn.textContent = on ? "Turn back" : "Turn over";
      if (reduced) { c.classList.toggle("is-flipped", on); return; }
      c.classList.remove("is-turning");
      void c.offsetWidth;
      c.classList.add("is-turning");
      setTimeout(() => c.classList.toggle("is-flipped", on), 220);
    });
  });

  /* ---------- the chess puzzle ----------
     The Opera Game, Paris 1858, before 16.Qb8+. The one mate in two is
     16.Qb8+ Nxb8 17.Rd8# (checked with python-chess, as are the legal
     moves below). Any other legal move is played, then taken back. */
  const chess = $("#chess");
  if (chess && chess.showModal) {
    const START = "4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4";
    const STEPS = [
      { move: "b3b8", reply: "d7b8", legal: { g5: "d8 e7 h6 f6 h4 f4 e3 d2", b3: "b8 b7 e6 b6 d5 b5 c4 b4 a4 h3 g3 f3 e3 d3 c3 a3", d1: "d7 d6 d5 d4 d3 d2 h1 g1 f1 e1", c1: "d2 b1", h2: "h3 h4", g2: "g3 g4", f2: "f3 f4", c2: "c3 c4", a2: "a3 a4" },
        say: "Check. Black has to take the queen.", hint: "Hint: give up the queen." },
      { move: "d1d8", legal: { g5: "d8 e7 h6 f6 h4 f4 e3 d2", d1: "d8 d7 d6 d5 d4 d3 d2 h1 g1 f1 e1", c1: "d2 b1", h2: "h3 h4", g2: "g3 g4", f2: "f3 f4", c2: "c3 c4", b2: "b3 b4", a2: "a3 a4" },
        hint: "Hint: the rook finishes it." },
    ];
    /* one solid set for both sides; the stylesheet whitens and outlines
       White's */
    const GLYPH = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
    const NAME = { k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };
    const FILES = "abcdefgh";
    const board = $("[data-chess-board]", chess);
    const status = $("[data-chess-status]", chess);
    const sqs = {};
    let pos = {};
    let step = 0;
    let pick = "";
    let misses = 0;
    let busy = false;

    for (let r = 8; r >= 1; r--) {
      for (let f = 0; f < 8; f++) {
        const id = FILES[f] + r;
        const b = document.createElement("button");
        b.type = "button";
        b.className = "sq" + ((f + r) % 2 ? " sq--light" : " sq--dark");
        b.addEventListener("click", () => tap(id));
        board.appendChild(b);
        sqs[id] = b;
      }
    }
    function load(fen) {
      pos = {};
      fen.split("/").forEach((rank, i) => {
        let f = 0;
        rank.split("").forEach((ch) => {
          if (/\d/.test(ch)) f += Number(ch);
          else { pos[FILES[f] + (8 - i)] = ch; f++; }
        });
      });
    }
    function draw(last) {
      Object.keys(sqs).forEach((id) => {
        const b = sqs[id];
        const p = pos[id];
        /* U+FE0E keeps the glyphs as text, not emoji */
        b.textContent = p ? GLYPH[p.toLowerCase()] + "︎" : "";
        b.classList.toggle("is-white", !!p && p === p.toUpperCase());
        b.classList.toggle("is-last", !!last && last.indexOf(id) > -1);
        b.classList.remove("is-pick", "is-to");
        b.setAttribute("aria-label", id + (p ? ", " + (p === p.toUpperCase() ? "white " : "black ") + NAME[p.toLowerCase()] : ""));
      });
    }
    const play = (uci) => {
      const from = uci.slice(0, 2), to = uci.slice(2, 4);
      pos[to] = pos[from];
      delete pos[from];
      draw([from, to]);
    };
    function reset() {
      load(START);
      step = 0;
      pick = "";
      busy = false;
      draw();
      status.textContent = got.has("chess") ? "Solved before. Play it again." : "Tap a white piece, then a square.";
    }
    let before = "";
    function tap(id) {
      if (busy || step > 1) return;
      const legal = STEPS[step].legal;
      if (pick && legal[pick] && legal[pick].split(" ").indexOf(id) > -1) {
        const uci = pick + id;
        pick = "";
        if (uci === STEPS[step].move) {
          play(uci);
          if (step === 0) {
            busy = true;
            status.textContent = STEPS[0].say;
            setTimeout(() => {
              play(STEPS[0].reply);
              before = Object.assign({}, pos);
              step = 1;
              busy = false;
              status.textContent = "Now finish it.";
            }, reduced ? 0 : 700);
          } else {
            step = 2;
            sqs.e8.classList.add("is-mate");
            status.textContent = "Checkmate. Morphy played the same in 1858.";
            earn("chess");
          }
          return;
        }
        /* a legal move that does not mate: show it, then take it back */
        play(uci);
        busy = true;
        misses++;
        status.textContent = "Not that one: Black gets away." + (misses >= 2 ? " " + STEPS[step].hint : "");
        setTimeout(() => {
          if (step === 0) load(START);
          else pos = Object.assign({}, before);
          busy = false;
          draw();
        }, reduced ? 300 : 900);
        return;
      }
      draw();
      pick = legal[id] ? id : "";
      if (!pick) return;
      sqs[id].classList.add("is-pick");
      legal[id].split(" ").forEach((t) => sqs[t].classList.add("is-to"));
    }

    $$("[data-chess-open]").forEach((b) => b.addEventListener("click", () => {
      reset();
      chess.showModal();
    }));
    $("[data-chess-close]", chess).addEventListener("click", () => chess.close());
    $("[data-chess-reset]", chess).addEventListener("click", reset);
    outside(chess);
  }

  /* ---------- arrival ---------- */
  hud();
  showGot();
  /* an achievement earned on the way out (a side project) says so now */
  if (pending.length) {
    const keys = pending.filter((k) => byKey[k]);
    pending = [];
    save();
    told = level(xp() - keys.reduce((n, k) => n + byKey[k].xp, 0)).i;
    setTimeout(() => keys.forEach((k) => announce(byKey[k])), reduced ? 0 : 2400);
  }
})();

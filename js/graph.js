/* ------------------------------------------------------------------ *
 *  Vault graph — a stand-in for the Obsidian graph view.
 *
 *  Nothing here is read from the real vault: the nodes are generated,
 *  unlabelled and deterministic (a seeded PRNG, so the picture is the
 *  same on every load). It shows the SHAPE of the knowledge base —
 *  four zones, a bright curated core, faint evidence at the rim — and
 *  the one move that matters: a meeting arrives at the edge, and its
 *  durable fact is promoted into a curated page.
 *
 *  Canvas, no library. It runs only while it is on screen.
 * ------------------------------------------------------------------ */
(function () {
  "use strict";

  const canvas = document.getElementById("vault");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- zones ------------------------------------------ */
  /* r is the distance from the centre: curated sits in the middle,
     raw at the rim. That is the trust gradient, drawn. */
  const ZONES = [
    { key: "curated", n: 26, r: 0.3, colour: "#8b7cf6", size: 4.6, alpha: 1 },
    { key: "meetings", n: 20, r: 0.62, colour: "#4fe0c8", size: 3.3, alpha: 0.85 },
    { key: "work", n: 18, r: 0.74, colour: "#6ea8fe", size: 3.3, alpha: 0.8 },
    { key: "raw", n: 16, r: 0.92, colour: "#5f6576", size: 2.6, alpha: 0.7 },
  ];

  /* a small seeded PRNG — the layout must not change between loads */
  let seed = 20260912;
  function rnd() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }

  const nodes = [];
  const edges = [];

  ZONES.forEach((zone, zi) => {
    for (let i = 0; i < zone.n; i++) {
      const a = (i / zone.n) * Math.PI * 2 + rnd() * 0.5;
      const rad = zone.r * (0.72 + rnd() * 0.42);
      nodes.push({
        zone: zi,
        x: Math.cos(a) * rad,
        y: Math.sin(a) * rad * 0.86,
        /* every node drifts on its own slow clock */
        p: rnd() * Math.PI * 2,
        s: 0.22 + rnd() * 0.3,
        d: 0.004 + rnd() * 0.006,
        pulse: 0,
        born: 1,
      });
    }
  });

  const firstOf = (zi) => nodes.findIndex((n) => n.zone === zi);
  const countOf = (zi) => ZONES[zi].n;

  function link(a, b, weight) {
    edges.push({ a: a, b: b, w: weight || 0.1, life: 1 });
  }

  /* curated pages cite each other — that is the core mesh */
  const c0 = firstOf(0);
  for (let i = 0; i < countOf(0); i++) {
    link(c0 + i, c0 + ((i + 1) % countOf(0)), 0.16);
    if (rnd() > 0.45) link(c0 + i, c0 + Math.floor(rnd() * countOf(0)), 0.1);
  }
  /* every other zone hangs off a curated page: evidence, cited */
  [1, 2, 3].forEach((zi) => {
    const start = firstOf(zi);
    for (let i = 0; i < countOf(zi); i++) {
      link(start + i, c0 + Math.floor(rnd() * countOf(0)), zi === 3 ? 0.05 : 0.09);
    }
  });

  /* ---------------- the promote beat ------------------------------- */
  /* Every few seconds a new page arrives at the rim, a link is drawn to
     the curated page that owns the fact, and that page brightens. */
  let beat = null;
  let nextBeat = 1.4;

  function startBeat(t) {
    const a = rnd() * Math.PI * 2;
    const node = {
      zone: 1,
      x: Math.cos(a) * 1.06,
      y: Math.sin(a) * 0.92,
      p: rnd() * Math.PI * 2,
      s: 0.25,
      d: 0.005,
      pulse: 0,
      born: 0,
    };
    nodes.push(node);
    const target = c0 + Math.floor(rnd() * countOf(0));
    const edge = { a: nodes.length - 1, b: target, w: 0.12, life: 0 };
    edges.push(edge);
    beat = { t0: t, node: node, target: target, edge: edge, done: false };
  }

  /* ---------------- drawing ---------------------------------------- */
  let w = 0, h = 0, cx = 0, cy = 0, sx = 1, sy = 1;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w / 2;
    cy = h / 2;
    /* the frame is wide, the graph is not: spread it sideways up to a
       limit so a 2:1 panel fills without the cluster turning into a
       stripe */
    sy = h * 0.45;
    sx = Math.min(w * 0.43, sy * 1.75);
  }

  function pos(node, t) {
    const wob = reduced ? 0 : Math.sin(t * node.d * 6 + node.p) * node.s * 0.02;
    const wob2 = reduced ? 0 : Math.cos(t * node.d * 5 + node.p) * node.s * 0.02;
    return [cx + (node.x + wob) * sx, cy + (node.y + wob2) * sy];
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);

    /* edges first, so the nodes sit on top */
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const A = nodes[e.a];
      const B = nodes[e.b];
      if (!A || !B) continue;
      const life = Math.min(1, e.life) * Math.min(1, A.born) * Math.min(1, B.born);
      if (life <= 0) continue;
      const [ax, ay] = pos(A, t);
      const [bx, by] = pos(B, t);
      ctx.strokeStyle = "rgba(255,255,255," + (e.w * life).toFixed(3) + ")";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.born <= 0) continue;
      const z = ZONES[n.zone];
      const [x, y] = pos(n, t);
      const grow = Math.min(1, n.born);
      const r = z.size * grow * (1 + n.pulse * 0.9);

      if (n.pulse > 0.01) {
        ctx.fillStyle = z.colour;
        ctx.globalAlpha = n.pulse * 0.18;
        ctx.beginPath();
        ctx.arc(x, y, r * 4.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = z.alpha * grow;
      ctx.fillStyle = z.colour;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    /* the fact travelling up into the curated page */
    if (beat && !beat.done) {
      const p = Math.min(1, (t - beat.t0 - 0.55) / 0.85);
      if (p > 0) {
        const [ax, ay] = pos(beat.node, t);
        const [bx, by] = pos(nodes[beat.target], t);
        const e = p * p * (3 - 2 * p);
        ctx.fillStyle = "#c0b4ff";
        ctx.beginPath();
        ctx.arc(ax + (bx - ax) * e, ay + (by - ay) * e, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* ---------------- loop ------------------------------------------- */
  let running = false;
  let t0 = 0;
  let last = 0;

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!t0) { t0 = now; last = now; }
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    /* the beat */
    if (t > nextBeat && !beat) startBeat(t);
    if (beat) {
      beat.node.born = Math.min(1, beat.node.born + dt * 2.2);
      if (t - beat.t0 > 0.4) beat.edge.life = Math.min(1, beat.edge.life + dt * 1.6);
      if (t - beat.t0 > 1.4 && !beat.done) {
        nodes[beat.target].pulse = 1;
        beat.done = true;
        nextBeat = t + 3.6;
        /* the rim stays a fixed size: the oldest arrival settles in */
        if (nodes.length > 110) nodes.splice(ZONES[0].n + ZONES[1].n, 1);
      }
    }
    if (beat && beat.done && t > nextBeat - 0.2) beat = null;

    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].pulse > 0) nodes[i].pulse = Math.max(0, nodes[i].pulse - dt * 0.8);
    }

    draw(t);
  }

  function start() {
    if (running || reduced) return;
    running = true;
    t0 = 0;
    requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
  }

  /* ---------------- wiring ----------------------------------------- */
  resize();
  draw(0);

  let resizeId = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeId);
    resizeId = setTimeout(function () { resize(); draw(0); }, 150);
  });

  if (!reduced) {
    /* it runs only while it is on screen, and never in a hidden tab */
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !document.hidden) start();
          else stop();
        });
      },
      { threshold: 0.05 }
    );
    io.observe(canvas);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else if (canvas.getBoundingClientRect().bottom > 0) start();
    });
  }
})();

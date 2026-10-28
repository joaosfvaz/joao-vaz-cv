/* ------------------------------------------------------------------ *
 *  The recruiter view's tools — for a visitor who came with one
 *  question:
 *
 *  1. The skill finder. Pick a skill, or paste a job description, and
 *     it lists the places on this page that show it, best matches first;
 *     each one opens its role or product and points at it. The page says
 *     what each part shows with data-ev tags, so the finder makes no
 *     claim of its own. A pasted text is matched here, in the browser:
 *     it is never stored and never sent.
 *  2. Links to one role or product. Each open one offers "copy a link",
 *     and a link with its id opens it on arrival.
 *  3. The quick answers' placeholders (data-todo) show on a local
 *     preview only, so an unfilled one never reaches the live site.
 *
 *  The recruiter view only: the curious view skips all of it.
 * ------------------------------------------------------------------ */
(function () {
  "use strict";

  const S = window.Scroll;
  const H = window.Home;
  if (!S || S.mode === "curious") return;
  const reduced = S.reduced;
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.prototype.slice.call((el || document).querySelectorAll(sel));
  const clean = (t) => (t || "").replace(/\s+/g, " ").trim();
  /* the first line of a title, without its <small> */
  const head = (el) => (el ? clean(el.firstChild.textContent) : "");

  /* a placeholder answer shows on this machine only */
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
    document.documentElement.classList.add("is-preview");
  }

  /* ------------------------------------------------------------------
   * Going to a part of the page: open its role or product if it is
   * closed, wait for the accordion to settle, then bring it to the
   * middle of the screen and mark it for a moment.
   * ---------------------------------------------------------------- */
  let markTimer = 0;
  function mark(el) {
    $$(".is-found").forEach((x) => x.classList.remove("is-found"));
    el.classList.add("is-found");
    clearTimeout(markTimer);
    markTimer = setTimeout(() => el.classList.remove("is-found"), 2600);
  }
  function go(el) {
    const item = el.closest(".acc__item");
    const opening = item && !item.classList.contains("is-open");
    const behavior = reduced ? "auto" : "smooth";
    if (opening) {
      $(".acc__head", item).click();
      item.scrollIntoView({ block: "start", behavior: behavior });
    }
    setTimeout(() => {
      el.scrollIntoView({ block: el === item ? "start" : "center", behavior: behavior });
      mark(el);
      /* the keyboard follows the eye: focus lands on the part itself */
      if (el.tabIndex < 0 && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    }, opening ? 620 : 0);
  }

  /* ------------------------------------------------------------------
   * The skill finder. Each skill: its key in the data-ev tags, its name
   * on the chip, and the words in a job description that ask for it.
   * ---------------------------------------------------------------- */
  const SKILLS = [
    { key: "agents", name: "AI agents", re: /\b(ai agents?|agentic|agents?\b|llms?\b|large language models?|gen ?ai\b|generative ai|ai assistants?|chatbots?|copilots?|conversational ai|rag\b|mcp\b|prompt engineering|prompting)/ },
    { key: "evals", name: "Evals & AI quality", re: /\b(evals?\b|evaluations?\b|guardrails?|hallucinat|observability|tracing\b|traces\b|llm[- ]as[- ]an?[- ]judge|red[- ]teaming|responsible ai|ai safety|ai quality|human[- ]in[- ]the[- ]loop)/ },
    { key: "ml", name: "Data products & ML", re: /\b(machine learning|ml\b|data products?|pricing|recommendations?\b|recommender|personali[sz]ation|data science|predictive|forecast)/ },
    { key: "experiments", name: "Experimentation", re: /\b(a\/b|ab tests?|experiment|split tests?|hypothes[ie]s|fake[- ]door|test[- ]and[- ]learn)/ },
    { key: "research", name: "User research", re: /\b(user research|customer research|research\b|discovery|interviews?\b|usability|jobs[- ]to[- ]be[- ]done|jtbd\b|qualitative|customer needs|user needs)/ },
    { key: "analytics", name: "Analytics & metrics", re: /\b(analytics|sql\b|metrics?\b|kpis?\b|dashboards?|data[- ]driven|data[- ]informed|ga4\b|google analytics|amplitude|mixpanel|tableau|looker|power bi|business intelligence|insights)/ },
    { key: "strategy", name: "Strategy & roadmap", re: /\b(strateg|roadmaps?|vision\b|prioriti[sz]|okrs?\b|outcomes?\b|business cases?|p&l\b)/ },
    { key: "stakeholders", name: "Stakeholders & markets", re: /\b(stakeholders?|cross[- ]functional|alignment|international|multi[- ]market|markets\b|countries|go[- ]to[- ]market|gtm\b|communicat|senior leadership|executives?)/ },
    { key: "leading", name: "Leading & coaching", re: /\b(leadership|mentor|coach|enablement|workshops?|facilitat|influenc|people management|team leads?|lead a team|leading a team|training\b|upskill)/ },
    { key: "building", name: "Building with AI tools", re: /\b(prototyp|claude|cursor\b|vibe[- ]cod|no[- ]code|low[- ]code|hands[- ]on|ai tools|ai[- ]assisted|ai[- ]native|python|javascript|coding|builders?\b)/ },
    { key: "delivery", name: "Delivery & technical", re: /\b(agile|scrum|kanban|jira|delivery|ship(ping)?\b|feature flags?|launchdarkly|slis?\b|slos?\b|microservices|graphql|apis?\b|technical|engineer|aws\b|cloud|serverless)/ },
    { key: "b2b", name: "B2B & marketplaces", re: /\b(b2b|marketplaces?|saas\b|dealers?|dealerships?|classifieds|two[- ]sided|automotive|cars?\b|mobility|smbs?\b|smes?\b|professional users)/ }
  ];
  const byKey = {};
  SKILLS.forEach((k) => { byKey[k.key] = k; });

  /* what a tagged part says: where it is, its title and its line */
  function where(el) {
    const role = el.closest("#work .acc__item");
    if (role) return head($(".acc__title", role)) + " · " + clean($(".acc__when", role).textContent);
    if (el.closest(".kit")) return "Toolkit";
    if (el.closest("#products")) return "Products";
    if (el.closest("#ai")) return "AI & agents";
    if (el.closest("#projects")) return "Side project";
    return "Summary";
  }
  function describe(el) {
    const text = (sel) => clean(($(sel, el) || {}).textContent);
    if (el.classList.contains("acc__item")) return [head($(".acc__title", el)), text(".acc__body p")];
    if (el.matches(".ships li")) return [text("b"), text("span")];
    const dt = $("dt", el);
    /* a counter's text moves while it counts: read its final value */
    if (dt && dt.dataset.count) return [(dt.dataset.prefix || "") + dt.dataset.count + (dt.dataset.suffix || ""), text("dd")];
    if (dt) return [text("dt"), text("dd")];
    if (el.matches(".project")) return [text("h3"), text("p")];
    if (el.matches(".kit__group")) return [text("h4"), $$("li", el).map((li) => clean(li.textContent)).join(" · ")];
    return ["", clean(el.textContent)];
  }

  let evId = 0;
  const EV = $$("[data-ev]").filter((el) => !el.closest("[data-for='curious']")).map((el, i) => {
    if (!el.id) el.id = "ev-" + ++evId;
    const d = describe(el);
    /* a summary or a list of tools says less than a delivery: it comes
       after the deliveries, products, outcomes and projects */
    const weak = el.matches(".kit__group, .head__intro, .role__sum") || !!el.closest("#top");
    return { el: el, i: i, weak: weak, keys: el.dataset.ev.split(/\s+/), where: where(el), title: d[0], text: d[1] };
  });

  const finder = $("#finder");
  if (finder && finder.showModal && EV.length) {
    const box = $("[data-finder-skills]", finder);
    const area = $("[data-finder-text]", finder);
    const sum = $("[data-finder-sum]", finder);
    const list = $("[data-finder-list]", finder);
    const chosen = new Set();
    let pasted = null; // the skills a pasted text asks for, or null

    /* only the skills the page has evidence for get a chip */
    const chips = SKILLS.filter((k) => EV.some((e) => e.keys.indexOf(k.key) > -1)).map((k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "finder__skill";
      b.textContent = k.name;
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => {
        if (chosen.has(k.key)) chosen.delete(k.key);
        else chosen.add(k.key);
        pasted = null;
        render();
      });
      box.appendChild(b);
      return [k.key, b];
    });

    const names = (keys) => {
      const n = keys.map((k) => byKey[k].name);
      return n.length < 2 ? n.join("") : n.slice(0, -1).join(", ") + " and " + n[n.length - 1];
    };
    function say(parts) {
      sum.textContent = "";
      parts.forEach((p) => sum.appendChild(typeof p === "string" ? document.createTextNode(p) : p));
    }

    function render() {
      chips.forEach((c) => c[1].setAttribute("aria-pressed", String(chosen.has(c[0]))));
      list.textContent = "";
      const keys = SKILLS.map((k) => k.key).filter((k) => chosen.has(k));
      if (pasted && !keys.length) {
        const a = document.createElement("a");
        a.href = "mailto:joaosfvaz@gmail.com";
        a.textContent = "joaosfvaz@gmail.com";
        say(["No skill on this page matches the text. Ask me directly: ", a, "."]);
        return;
      }
      if (!keys.length) { say([]); return; }
      /* best matches first: the deliveries before the summaries, then
         the parts that show the most of the chosen skills, then in page
         order */
      const hits = EV.map((e) => ({ e: e, n: e.keys.filter((k) => chosen.has(k)) }))
        .filter((h) => h.n.length)
        .sort((a, b) => a.e.weak - b.e.weak || b.n.length - a.n.length || a.e.i - b.e.i);
      const places = hits.length + (hits.length === 1 ? " place" : " places");
      if (pasted) say(["The text asks for " + names(keys) + ". " + places + " on this page show " + (keys.length > 1 ? "them" : "it") + ", the best matches first."]);
      else say([places + " on this page show " + names(keys) + (keys.length > 1 ? ", the best matches first." : ".")]);
      hits.forEach((h) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "#" + h.e.el.id;
        a.className = "finder__hit";
        const w = document.createElement("span");
        w.className = "meta";
        w.textContent = h.e.where;
        a.appendChild(w);
        if (h.e.title) {
          const b = document.createElement("b");
          b.textContent = h.e.title;
          a.appendChild(b);
        }
        const t = document.createElement("span");
        t.className = "finder__line";
        t.textContent = h.e.text;
        a.appendChild(t);
        if (keys.length > 1) {
          const k = document.createElement("i");
          k.textContent = h.n.map((x) => byKey[x].name).join(" · ");
          a.appendChild(k);
        }
        a.addEventListener("click", (ev) => {
          ev.preventDefault();
          finder.close();
          go(h.e.el);
        });
        li.appendChild(a);
        list.appendChild(li);
      });
    }

    /* a pasted job description picks the skills it asks for */
    let typing = 0;
    area.addEventListener("input", () => {
      clearTimeout(typing);
      typing = setTimeout(() => {
        const t = area.value.toLowerCase().replace(/[‘’]/g, "'");
        chosen.clear();
        if (!clean(t)) { pasted = null; render(); return; }
        SKILLS.forEach((k) => { if (chips.some((c) => c[0] === k.key) && k.re.test(t)) chosen.add(k.key); });
        pasted = true;
        render();
      }, 250);
    });

    $$("[data-finder-open]").forEach((b) => b.addEventListener("click", () => finder.showModal()));
    $("[data-finder-close]", finder).addEventListener("click", () => finder.close());
    /* a click beside the panel, on its backdrop, closes it */
    finder.addEventListener("click", (ev) => {
      if (ev.target !== finder) return;
      const r = finder.getBoundingClientRect();
      if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) finder.close();
    });
  }

  /* ------------------------------------------------------------------
   * A link to one role or product. Every open one offers to copy its
   * link, in the recruiter view so it opens the same for anyone; a link
   * with its id opens it on arrival.
   * ---------------------------------------------------------------- */
  $$("#products .acc__item[id], #work .acc__item[id]").forEach((item) => {
    const what = item.closest("#work") ? "role" : "product";
    const p = document.createElement("p");
    p.className = "share";
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /></svg>';
    b.appendChild(document.createTextNode("Copy a link to this " + what));
    b.addEventListener("click", () => {
      const url = location.origin + "/?mode=recruiter#" + item.id;
      const done = () => H && H.toast("Link copied", "It opens this " + what + " in the recruiter view.");
      /* no clipboard: the address bar holds the link instead */
      const fallback = () => {
        history.replaceState(null, "", "#" + item.id);
        if (H) H.toast("Link ready", "Copy it from the address bar.");
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(done, fallback);
      else fallback();
    });
    p.appendChild(b);
    $(".acc__body", item).appendChild(p);
  });

  const target = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
  if (target && target.matches("#products .acc__item, #work .acc__item")) {
    const arrive = () => setTimeout(() => go(target), 200);
    if (document.readyState === "complete") arrive();
    else window.addEventListener("load", arrive, { once: true });
  }
})();

# João Vaz — Personal Website

A single-page personal site built from my CV. Liquid glass on a near-black ground: two wavy glass
bands flow across every page from the header to the footer, and every surface is a translucent pane
with a bright hairline edge. Everything that moves is CSS. No framework, no build step, and no
runtime JavaScript dependency at all.

The motion character comes from [animejs.com](https://animejs.com) (monospace micro-labels,
springy staggers) and the typographic discipline from [wodniack.dev](https://wodniack.dev)
(display scale, numbered section rules, a ticker strip). The glass — the pill nav, the buttons, the
hero — came later.

Three components are ported from [ObsidianUI](https://www.obsidianui.dev/components) (MIT): the
nav magnet, the reading fill and the arrow-fill call to action. ObsidianUI ships React, Tailwind
and Motion; this site has no framework and no build step, so the three are rewritten in plain CSS
and in `js/ui.js`, against `window.Scroll` like every other effect here. The idea is theirs, the
code is not.

## Highlights

- **The liquid scene** — soft accent light drifting behind two wide glass bands that run off both
  edges of the page. Each band is one SVG tile — a wave along the top, two along the bottom —
  repeated and used as both its picture and its mask, so the edges stay wavy and the sideways flow
  loops without a seam. The front band blurs and saturates what passes under it. The scene is
  fixed, so it runs from the header to the footer on every page, lit in that page's accent trio.
  - **Motion:** CSS flows each band sideways and lets it breathe (a slow tilt and swell), each on
    its own clock. `js/scene.js` adds the scroll: the bands rise and fall at different rates, fast
    scrolling stretches them a little, and a veil rises as the hero leaves so the copy below has a
    calm ground. There is no pointer interaction.
  - **Structure:** `.scene__band` (scroll) › `.scene__tilt` (breathing) › `.scene__flow` (the
    loop). No two motions share a transform, and all of it is transform and opacity.
  - **Reduced motion:** nothing runs and the scene holds its first frame.
- **Reveals** — glass settles out of a blur as the reading position reaches it, and panes catch a
  sweep of light as they land.
- **The nav magnet** — one highlight slides between the five section links. It follows the pointer
  over the row, and rests on the section being read when the pointer leaves — with an accent
  hairline under the label, so "where am I" and "where would this take me" never look the same.
  The section comes from the one scroll driver. An `IntersectionObserver` used to do that job, and
  a section taller than the window never reached its 0.5 threshold, so the nav could sit on the
  wrong link for a whole screen.
- **The reading fill** — a lead paragraph is split into words, and the reading position fills them:
  dim ahead of the reader, an accent beat as the line arrives, the paragraph's own colour behind
  it. The colour is one `color-mix` on `currentColor`, so a word inside an accented `<em>` fills to
  that accent and not to ink. `js/ui.js` writes one number, `--lit`; CSS does the rest.
- **The arrow-fill call to action** — the nav button carries a light disc with an arrow at its
  right edge; on hover the disc opens across the whole pill and the label repeats in the dark ink
  of the page. Pure CSS behind one layer that `js/ui.js` builds from the button's own label.
- **Get in touch** — the hero button opens into a pill that types the email address in, one
  character every 60ms. The arrow copies it and the pill confirms; four seconds later the button
  comes back. There is no form and nothing is collected. Without the script it is a link to the
  contact section.
- **One scroll driver** — `js/scroll.js` is the only reader of scroll position. It samples
  `scrollY` once per animation frame, caches layout metrics and section anchors on resize, and
  runs a single `requestAnimationFrame` loop that every effect subscribes to. Nothing else binds a
  scroll listener for motion. The one exception is the project carousel, which listens to its own
  sideways track, not the page.
- **Project carousel** — the Building section is a 3D carousel. The track is a native sideways
  scroller with centre snapping, so a trackpad, shift-wheel, a swipe, the arrow keys and the arrow
  buttons all move it; the vertical wheel is never taken over. Three projects show at once (one on
  a phone), and it loops with no end: the projects are copied once before and once after, and when
  the track comes to rest on a copy it jumps by exactly one set to the same project among the
  originals, which draws the same frame. The copies are `aria-hidden` and out of the tab order. `js/carousel.js` writes each slide's distance from the centre into `--d` and `--f`, and
  CSS turns that into the magnified centre project and the neighbours turning towards it. Clicking
  a side project brings it to the centre; only the centre one follows its link. It opens on the
  slide marked `data-start`. Without the script it is a plain sideways row; under reduced motion it
  still snaps but nothing turns or grows.
- **The hero slab** — the hero is split: the name, a one-line pitch and the call to action on the
  left, a tall glass-rimmed portrait on the right (stacked above the name on a phone). A conic halo
  of the three accents turns slowly behind it. On a fine pointer the slab leans towards the cursor
  anywhere over the hero: `js/ui.js` eases two numbers, `--rx` and `--ry`, and CSS turns them into
  the lean, a small parallax of the photo inside the frame and a glare that moves against it. Three
  facts float on the slab's edges, each on its own clock. On a phone the stacked hero is taller
  than the window, so the copy only starts to fade once the hero's foot is on screen.
- **Products** — a bento of the six products I lead, each explained by what it does for a dealer
  rather than by its name in the app. The wide tiles alternate sides (on two columns only the
  assistant and the market tile stay wide). A soft light follows the pointer across each tile
  (`--mx`, `--my`). The AI assistant tile leads and wears the violet light.
- **The trace** — the AI section plays an illustrative agent run once it lands: the dealer's
  question, then each span draws its bar on a shared timeline (route, two tool calls, a mandate
  check, the answer), then the reply and its eval results. It is CSS only, keyed on the `.is-in`
  class the reveal already sets, and the markup is the finished trace. It is labelled as
  illustrative: it shows the shape of the runs, not real data. Beside it, the concepts I work in —
  evals, traces, mandates, automation classes, MCP tools, context, human review — each in a pane.
- **The accelerator gallery** — three photos under the Prosus AI Accelerator entry, desaturated a
  little until hovered.
- **Cache busting** — GitHub Pages lets browsers keep a file for ten minutes, so a deploy could
  pair a new page with the old stylesheet. Every CSS and JS link carries a `?v=` stamp; change it
  on every page whenever `styles.css`, a page stylesheet or a script changes.
- **Fail-open reveals** — the document is written in its finished state. An inline script in the
  `<head>` adds `.js` to `<html>`, and that class is the only thing that hides anything; `js/ui.js`
  puts it back as the reading position arrives. A reveal that never fires shows readable copy
  rather than a blank block. Reveals are driven by position, not by `IntersectionObserver`, so a
  deep link or a fast flick cannot skip one, and a three-second failsafe catches the rest.
- **Type that moves** — the hero name and the contact heading rise character by character out of
  their own masks; section rules draw themselves; skill chips land one after another; stat
  counters run up to the value already written in the markup.
- **Scrollytelling** — the experience timeline draws its spine as you read, sticks each date
  beside its role, and lights the entry under the reading line.
- **Interactive on hover** — magnetic buttons that lean towards the pointer, glass panes that
  brighten and lift, sliding contact rows, masked nav labels, and a ticker that pauses under the
  cursor.
- **Visual enumerations** — no plain text lists. Skills render as branded icon chips (Claude,
  Cursor, Jira, GraphQL, New Relic, Postman, GA4, Maze…), experience carries the **OLX Group**
  lockup (circular "G" symbol + OLX wordmark), and education shows the real **University of Minho**
  and **TU Graz** logos on light tiles, with circular flag badges for languages. Everything is
  inline SVG (`js/icons.js`), so there's no runtime network dependency for the icons.

  Brand marks: tool icons from [Simple Icons](https://simpleicons.org) (CC0); the University of
  Minho and TU Graz logos from Wikimedia Commons; the OLX Group circular symbol reconstructed as
  SVG. Used to identify the respective employer/institutions.
- **Liquid glass** — one recipe for every pane (`--glass-fill`, `--glass-edge`, `--glass-shine` at
  the top of `styles.css`): a faint white fill the page's light shows through, a masked gradient
  hairline on `::before`, and a top highlight. The light behind them is the liquid scene, so the
  panes show the glass moving through them. The accent trio (electric blue → violet → teal) stays
  for type and small strokes.
- **Accessible** — `prefers-reduced-motion` takes an explicit branch, not a stripped animation:
  the scroll loop never starts, and every sequence renders at its end state — the CSS glass scene
  included, which holds its first frame. Sticky positioning is dropped below 900px.

## Pages

Every page is a directory index, so the URLs carry no `.html`. GitHub Pages has no URL rewriting;
this is the only way to get clean paths.

| Route | File | What it is |
| --- | --- | --- |
| `/` | `index.html` | The CV itself: hero, about, experience, building, toolkit, contact |
| `/team-context/` | `team-context/index.html` | A read-only MCP server that opens the team wiki to the company assistant |
| `/pm-os/` | `pm-os/index.html` | A knowledge base a crew of scheduled Claude routines keeps current |
| `/tabiya/` | `tabiya/index.html` | A chess coach, and the AWS pipeline behind it |

Portugal Explicado has no page here: its card links straight out to the live app at
[joaosfvaz.github.io/portugal-explicado](https://joaosfvaz.github.io/portugal-explicado/), which
is built and hosted from its own repository.

Because the pages sit at different depths, **every stylesheet, script and asset reference is
root-relative**. A relative path would resolve differently per page. This is safe because the site
is served from the domain root, set by the `CNAME` file.

A project page loads `styles.css`, then `project.css`, then its own sheet, and reuses
`js/scroll.js` and `js/ui.js` unchanged.

- `project.css` holds everything every case study needs: the hero, the facts strip, the note grid,
  the takeaway list, the disclaimer, and the **diagram language** (`.d-box`, `.d-flow`, `.d-line`,
  `.d-arrows`). The diagram colours come from the page's accent variables through `color-mix`, so
  one diagram system serves every page and no page hard-codes a hex value.
- The page's own sheet re-points `--accent`, `--accent-2` and `--accent-3` — Tabiya to its Amber
  and Lapis, PM-OS to violet and teal, the MCP page to green — and adds only what is specific to
  that project.

To add a project page, copy that pattern. Do not fork the system: if two pages need the same
component, it belongs in `project.css`.

Tabiya's screenshots live in `assets/tabiya/` at 1600px wide as JPEG, and its brand marks are the
reverse (light-on-dark) cuts from that project's own `brand/logo/`.

**Neither the PM-OS page nor the MCP page carries content from the internal wiki they describe** —
no pages, no names, no numbers, no identifiers, no tokens. The graph view is generated by
`js/graph.js` from a seeded PRNG, not read from anything. Keep it that way: those pages are about
structure and mechanics, and that is the part which is safe to show.

## Run it

```bash
cd ~/ai-projects/personal-website
python3 dev-server.py 4599
# open http://localhost:4599
```

`dev-server.py` is `http.server` with `Cache-Control: no-store`, so an edit is always the thing the
browser runs. Any other static server works too. Only the webfonts come from the network.

## Structure

```
CNAME             # the custom domain GitHub Pages serves from
index.html        # markup + content (from the CV); every page opens with the #scene markup
tabiya/           # /tabiya/  — the chess coach and its AWS diagram
pm-os/            # /pm-os/   — the zones, the routines, the graph view
team-context/     # /team-context/ — the MCP tool surface and its security boundary
styles.css        # the system: all styling, animation and responsive rules
project.css       # the furniture every project page shares, diagrams included
tabiya.css        # what Tabiya adds: accents, lockup, screenshots
pm-os.css         # what PM-OS adds: accents, graph frame, zone cards, routine list
team-context.css  # what the MCP page adds: accents, tool grid, the allow/deny gate
js/scroll.js    # the single scroll driver: metrics, progress, one rAF loop
js/scene.js     # couples the glass bands to the scroll, and raises the veil
js/ui.js        # reveals, character splits, counters, marquee, timeline, magnetics, the hero CTA
js/graph.js     # the generated Obsidian-style graph on the PM-OS page (that page only)
js/icons.js     # inline-SVG icon system (brand marks + custom badges)
js/carousel.js  # the 3D project carousel in the Building section (loads after js/ui.js)
dev-server.py   # no-cache static server for development
```

Load order matters: `js/scroll.js` must define `window.Scroll` before `js/scene.js` and `js/ui.js`
consume it. Every page carries the
`#scene` markup right after `<body>`.

## Two rules to keep

1. **Fail open.** Write the finished state into `index.html`, and hide it only from a `.js`-scoped
   rule in `styles.css`. Never ship markup whose correct content only appears if a script runs —
   that is why the stat tiles carry `+150%`, not `0`, and `data-count` is the target to animate
   *up to*.
2. **One clock.** Anything that reacts to scroll subscribes to `window.Scroll`. Do not add a
   `scroll` listener, and do not turn on `scroll-behavior: smooth` globally — it desyncs every
   scroll-driven effect from the input. `js/ui.js` smooths anchor jumps on its own.
3. **Re-measuring re-fires.** `Scroll.measure()` re-tests every consumer against the current
   position, because a layout shift after load — the webfonts swapping in — otherwise leaves a
   deep-linked page holding reveals that already sit on screen.

A reveal animation always ends on `transform: none`, and `js/ui.js` drops the animation entirely
once it finishes. A held transform — even an identity matrix — becomes the containing block for
`.tl__meta`'s sticky dates and outranks the hover transforms on the chips.

## Editing content

All copy lives in `index.html`. Accent colours are CSS variables at the top of `styles.css`
(`--accent`, `--accent-2`, `--accent-3`) and nothing else needs to change when you retheme.

## Tuning the motion

- **Speed of a reveal** — `revealIn` in `styles.css`, and the `--i` stagger step (70ms).
- **The hero name** — `charUp`, and the 32ms per-character step in the `.is-lit` rule.
- **The glass bands** — the flow speed is the `flow` duration on each `.scene__flow` (46s back,
  30s front); the breathing is `breatheBack` and `breatheFront`; the wave shape is the SVG path in
  the `.scene__flow` background and mask; how far the bands travel on scroll is in `js/scene.js`;
  how dark the scene gets under the copy is `VEIL_TO`.
- **The light** — the `drift1`–`drift4` keyframes on `.aura__blob--*`.
- **The ticker** — the pixels-per-second divisor in the marquee block of `js/ui.js`.
- **The reading fill** — the window it fills over (`0.88` and `0.46` of the viewport height) and
  the word overshoot (`+ 5`) in the reading-fill block of `js/ui.js`; how sharp each word snaps is
  the `2.4` in `.js .fill .fw`, and how dark it starts is `--fill-dim`.
- **The nav magnet** — the reading line it tests, `0.34` of the viewport height, in the nav-tabs
  block of `js/ui.js`; the slide is the `--spring` transition on `.nav__magnet`.
- **The PM-OS graph** — the zone table at the top of `js/graph.js` (how many nodes each zone has
  and how far out it sits), and the beat interval at the bottom. It runs only while it is on
  screen and never in a hidden tab.

A split heading inside an `<h1>` is lit on load; every other `[data-split]` line waits for the
reading position, which is how the contact heading and the project titles behave.

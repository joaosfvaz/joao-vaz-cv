# João Vaz — Personal Website

A personal site built from my CV. Flat: a deep ground, a bold grotesque for display (Bricolage
Grotesque), Geist for text and Geist Mono for labels, hairline dividers instead of panels, and one
colour. A single blue carries every accent — section numbers, highlighted words, rules, active
states, the photo block, the dot field. Coral appears only as a warning mark inside the trace (a
human check, a refusal). No gradients, no glass. No framework, no build step, no runtime dependency.

The movement is kept to a few places on purpose, so each one is noticed:

- **The dot field** — a flat grid of dots behind the hero, drawn on a canvas by `js/home.js`. Dots
  rise and turn blue under the pointer (a lighter blue in a ripple), a ripple runs out from the photo once it lands, and a click
  or a tap on the hero sends another. The loop runs only while something moves; at rest it costs
  nothing. Under reduced motion it draws once and stays still.
- **The name and the photo** — the name rises letter by letter out of its two lines; the photo is
  wiped in from the bottom over a flat blue block that leans away from the pointer, settles from a
  slight zoom, then drifts a little against the scroll inside the overscan it keeps.
- **The load sequence** — one pass on arrival, choreographed in `home.css` (`--delay` on the hero's
  reveals): the bar drops in, the label, the name letter by letter, the line "I build tools for
  12,000+ car dealers and 10M+ visitors" with each number then underlined in blue, the pitch and
  the buttons; the blue block, then the photo; then the figures left to right.
- **Headings** — every section heading rises word by word out of its own masks when it arrives
  (`js/home.js` wraps the words; words inside the blue `<em>` stay in it).
- **Dividers that draw** — every rule (sections, rows, the figures strip) draws from the left as
  its row arrives. They are pseudo-elements scaled on `transform`, not borders.
- **Scroll depth** — as the hero leaves, its copy lifts a little faster than the page and dims, so
  the name and the photo part company.
- **The word strip** — one band of big type between the hero and the work. It runs sideways at a
  steady pace, speeds up with the scroll and turns round when the scroll does; the set of words is
  copied once and the track jumps back by exactly one set, so the loop has no seam.
- **Accordions** — the products and the roles open one at a time. A blue rule draws
  along the row under the pointer and stays under the open one; the plus turns into a minus; the height is a
  `grid-template-rows` transition. Without the script every panel is open.
- **The playable trace** — the AI section has a small trace window. The visitor picks one of three
  dealer questions (a read-only answer, a price change that needs a human to confirm, an
  off-topic question the guardrail refuses) and the run plays out: routing, tool calls, the
  mandate check, the answer, the evals. It is labelled illustrative. The markup holds the first run
  finished; the script takes over.
- **Projects** — flat cards that fill with blue under the pointer, wiped in from the bottom.

## Navigation

- **The bar** — the name, four sections and Contact. The active section is underlined, and a
  hairline under the bar fills with the reading position.
- **The section index** — on screens 1400px and wider, numbers 01–05 down the left edge, each with
  a line that fills as its section is read. Labels show on hover. It stays out of the hero.
- **The dock** — on phones the section links move into a dock at the bottom, under the thumb. The
  current section is filled in.

All three read the same thing: the section under a reading line a third of the way down the
window, from `window.Scroll`'s anchors.

## Pages

Every page is a directory index, so the URLs carry no `.html`. GitHub Pages has no URL rewriting;
this is the only way to get clean paths.

| Route | File | What it is |
| --- | --- | --- |
| `/` | `index.html` | The CV itself: hero, products, AI, experience, projects, contact |
| `/team-context/` | `team-context/index.html` | A read-only MCP server that opens the team wiki to the company assistant |
| `/pm-os/` | `pm-os/index.html` | A knowledge base a crew of scheduled Claude routines keeps current |
| `/tabiya/` | `tabiya/index.html` | A chess coach, and the AWS pipeline behind it |

Portugal Explicado has no page here: its card links straight out to the live app at
[joaosfvaz.github.io/portugal-explicado](https://joaosfvaz.github.io/portugal-explicado/), which
is built and hosted from its own repository.

Because the pages sit at different depths, **every stylesheet, script and asset reference is
root-relative**. A relative path would resolve differently per page. This is safe because the site
is served from the domain root, set by the `CNAME` file.

The home page loads only `home.css`, `js/scroll.js` and `js/home.js`. A project page loads
`styles.css`, then `project.css`, then its own sheet, and reuses `js/scroll.js` and `js/ui.js`
unchanged. The **Flat** block at the end of `project.css` takes the older glass system down to the
home page's look — the scene hidden, panes without gradients or shadows, hairline borders, the
display grotesque and Geist — while each page keeps its own accent trio.

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
index.html        # the home page: markup + content (from the CV)
home.css          # the home page's whole stylesheet
js/home.js        # the home page's behaviour: reveals, hero, counters, accordions, trace, nav
tabiya/           # /tabiya/  — the chess coach and its AWS diagram
pm-os/            # /pm-os/   — the zones, the routines, the graph view
team-context/     # /team-context/ — the MCP tool surface and its security boundary
styles.css        # the project pages' base system (the older glass system)
project.css       # the furniture every project page shares, diagrams included, and the Flat block
tabiya.css        # what Tabiya adds: accents, lockup, screenshots
pm-os.css         # what PM-OS adds: accents, graph frame, zone cards, routine list
team-context.css  # what the MCP page adds: accents, tool grid, the allow/deny gate
js/scroll.js      # the single scroll driver: metrics, anchors, progress, one rAF loop
js/ui.js          # project pages: reveals, character splits, counters, marquee, magnetics
js/scene.js       # project pages: the (now hidden) glass scene
js/graph.js       # the generated Obsidian-style graph on the PM-OS page (that page only)
js/icons.js       # project pages: inline-SVG icon system
dev-server.py     # no-cache static server for development
```

`js/scroll.js` must load before any script that consumes `window.Scroll`. Its `SECTION_IDS` list
is the home page's sections; the navigation reads their anchors from it.

## Rules to keep

1. **Fail open.** Write the finished state into the HTML, and hide it only from a `.js`-scoped
   rule. Never ship markup whose correct content only appears if a script runs — that is why the
   figures carry `+150%`, not `0`, and `data-count` is the target to count *up to*; why every
   accordion panel is open without the script; and why the trace's markup is a finished run.
2. **One clock.** Anything that reacts to scroll subscribes to `window.Scroll`. Do not add a
   `scroll` listener, and do not turn on `scroll-behavior: smooth` globally. `js/home.js` smooths
   anchor jumps on its own.
3. **Re-measuring re-fires.** `Scroll.measure()` re-tests every consumer against the current
   position. An accordion calls it once its panel settles, and the webfonts call it when they land.
4. **Cache busting.** GitHub Pages lets browsers keep a file for ten minutes, so a deploy could pair
   a new page with an old stylesheet. Every CSS and JS link carries a `?v=` stamp; change it on
   every page whenever a stylesheet or a script changes.

## Editing content

All copy lives in the HTML. The palette is the block of variables at the top of `home.css`: `--blue`
(the one accent), `--blue-2` (its lighter step), `--coral` (the trace's warning mark) and `--on`,
the text colour on a blue fill. Change `--blue` and the whole page follows.
The trace's three runs are the `RUNS` table in `js/home.js`.

## Tuning the motion

- **Reveals** — `.js .rv.is-in` in `home.css`, and the `--i` stagger step (70ms).
- **The dot field** — `GAP` (dot spacing), `REACH` (pointer radius) and the ripple speed (`0.75`
  px per ms) in the dot-field block of `js/home.js`.
- **The load sequence** — the `--delay` values under "Motion" in `home.css`, and the 45ms
  per-character step and 250ms start of the name.
- **The word strip** — the base pace (`0.6` px per frame) and the scroll boost (`0.3`) in the
  strip block of `js/home.js`.
- **The trace** — the per-part delays in `play()` (600ms for the question and the answer, 420ms per
  span, 140ms per eval).
- **The PM-OS graph** — the zone table at the top of `js/graph.js`.

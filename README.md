# João Vaz — Personal Website

A personal site built from my CV. Flat: a deep ground, a bold grotesque for display (Bricolage
Grotesque), Geist for text and Geist Mono for labels, hairline dividers instead of panels, and two
colours on top of white and grey. Blue (`--accent`) carries the accents — section numbers,
highlighted words, rules, active states, the photo block. Orange (`--accent-2`) is the second
voice, used sparingly — the second underline in the hero, the square on the photo, the strip's
stars, half the project cards, the contact heading, the ripple in the dot field, the warning marks
in the trace. No gradients, no glass. No framework, no build step, no runtime dependency.

Every page — the home page and the three project pages — runs on the same system: `home.css`,
`js/scroll.js` and `js/home.js`. A project page only swaps the main colour: PM-OS is violet,
Team-context green, Tabiya its own amber (with its brand's lapis as the second colour instead of
orange).

The movement is kept to a few places on purpose, so each one is noticed:

- **The dot field** — a flat grid of dots behind the hero, drawn on a canvas by `js/home.js`. Dots
  rise and take the accent colour under the pointer (orange in a ripple), a ripple runs out from the photo once it lands, and a click
  or a tap on the hero sends another. The loop runs only while something moves; at rest it costs
  nothing. Under reduced motion it draws once and stays still.
- **The name and the photo** — the name rises letter by letter out of its two lines; the photo is
  wiped in from the bottom over a flat blue block that leans away from the pointer (a small orange square leans the other way), settles from a
  slight zoom, then drifts a little against the scroll inside the overscan it keeps.
- **The load sequence** — one pass on arrival, choreographed in `home.css` (`--delay` on the hero's
  reveals): the bar drops in, the label, the name letter by letter, the line "I build tools for
  12,000+ car dealers and 10M+ visitors" with the numbers then underlined, one blue and one orange, the pitch and
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
- **Roles** — each role in Experience opens into two columns: **Outcomes**, as numbers in the
  accent that count up every time the role opens, and **Deliveries**, one line each with a square
  in the second colour. The tiles and the lines land one after another.
- **Toolkit** — under Experience, the skills sit in groups on the same hairline grid as the outcome
  tiles, each skill a tag. Agentic AI leads, wide and in the accent. A group's tags land one after
  another as it arrives (`--t`, set by `js/home.js`). Education and languages close it as two plain
  facts.
- **Accordions** — the products and the roles open one at a time. A blue rule draws
  along the row under the pointer and stays under the open one; the plus turns into a minus; the height is a
  `grid-template-rows` transition. Without the script every panel is open.
- **The playable trace** — the AI section has a small trace window. The visitor picks one of three
  dealer questions (a read-only answer, a price change that needs a human to confirm, an
  off-topic question the guardrail refuses) and the run plays out: routing, tool calls, the
  mandate check, the answer, the evals. It is labelled illustrative. The markup holds the first run
  finished; the script takes over.
- **Projects** — flat cards that fill with colour under the pointer (blue and orange in a
  checkerboard), wiped in from the bottom.

## Logo and icons

The mark is a **JV monogram with an orange full stop** on a blue rounded square — the same blue and
orange as the site, and the same full stop as "João Vaz." in the hero. It is hand-drawn SVG paths,
so it needs no font.

- `favicon.svg` (and the same file as `assets/brand/logo.svg`) is the master. The bar on every page
  carries it inline next to the name; on hover the mark tilts and the dot grows.
- `assets/brand/favicon-32.png` and `favicon.ico` are the fallbacks for browsers without SVG icons.
- `apple-touch-icon.png` (180px) and `assets/brand/icon-192.png` / `icon-512.png` are full-bleed
  squares with the mark smaller, because phones round the corners themselves; `site.webmanifest`
  lists the last two.
- `assets/brand/og.jpg` (1200×630) is the card a shared link shows. Every page's `<head>` carries
  the Open Graph and Twitter tags that point at it, with the page's own title and description.

The PNGs, the ICO and the card were rendered from SVG and HTML with headless Chrome (and ffmpeg for
the ICO). To change the mark, edit the paths in `favicon.svg` and in the bar's inline copy, then
render them again.

## Side quests

The personal side lives in a full-screen panel (`<dialog id="side-quests">` on the home page). The
controller button in the bar opens it, so does the link under Contact, and so does
`/#side-quests` — which is where the project pages' controller button points. Opening it plays a
short loading bar, then the title, the player card and the nine quest cards land in a run. Esc or
"Back to work" closes it.

- **Quest cards** — one per interest, numbered Q01–Q09, each with a status chip ("Daily" in the
  accent, "New quest" in orange).
- **The photo log** — my sports photography, then landscapes and places.
  - Each row is a three-column grid (`photolog__grid--shots`) of portrait tiles; a landscape
    frame (`shot--wide`) spans two tiles and takes the height of the portrait tile beside it. A
    row needs whole lines of three: each wide frame counts as two. On a phone the grid has two
    columns and fills gaps by itself, so a row with an even count of portrait tiles ends flush.
  - Each photo has two files in `assets/life/`: `<row>-N.jpg` (about 1280px, the viewer) and
    `<row>-N-sm.jpg` (640px wide, the tile; 900×562 and cropped to 8:5 for a wide frame), resized
    and stripped of camera metadata with ffmpeg (`-map_metadata -1`).
  - A click opens **the viewer** (`<dialog id="lightbox">`): the photo as large as the window
    allows, ← and → (keys or buttons) to move through all of them, Esc or a click outside to close.
    It reads the large file from each tile's `data-full`. To add a photo, save the two sizes and
    add a `<button class="shot" data-full="…">` tile like the others. A `data-full` photo outside
    the log (the Triathlon quest's `.quest__shot`) opens on its own, with no arrows or counter.

## Easter eggs

Four, quiet until found. A find shows a small note bottom left, and the footer starts counting
("Easter eggs found: 2 / 4"). Finds are stored in this browser only (`localStorage`, key `eggs`).

- **Type "evals"** anywhere (not in a field) — the AI trace scrolls into view and plays a hidden
  fourth run: "Who built this website?". On a project page the note points to the home page.
- **Click the logo five times** quickly — the mark turns once and the dot pops.
- **The Konami code** (↑↑↓↓←→←→BA) — flat confetti in the site's colours, and a note with the email.
- **Print the page** — the print styles turn it into a clean CV on paper: black on white, no
  navigation or motion, every product and role open, about four A4 pages.

The browser console greets whoever opens it, with a hint for the first egg. Under reduced motion
the confetti and the spin are skipped; the notes still show.

## Light and dark

Every page has a light and a dark theme, and a switch in the bar (a sun on dark, a moon on light).

- **Before the first paint**, a small script in each page's `<head>` sets `data-theme` on `<html>`:
  the visitor's saved choice (`localStorage`, key `theme`), else the system's
  `prefers-color-scheme`. So there is no flash of the wrong theme. Without scripts the page stays
  dark.
- **The light theme** is one block of overrides in `home.css` (`:root[data-theme="light"]`): a warm
  paper ground, dark ink, and the accents stepped down so text in them still reads on white. The
  faint fills and the floating bars (`--tint`, `--tint-2`, `--glass`, `--glass-2`) are mixed from
  `--ink`, `--bg` and `--surface`, so they follow the theme on their own. Each project page adds
  its own light accents next to its dark ones; Tabiya also swaps its lockup for an ink-on-paper cut.
- **The switch** (`js/home.js`) flips the attribute, saves the choice, updates the browser's
  `theme-color`, cross-fades the colours once (`.theme-fade`, 0.4s) and fires a `themechange`
  event. The dot field and the PM-OS graph listen for it and repaint in the new colours. Until the
  visitor chooses, the page follows the system if it changes.

## Navigation

- **The bar** — the name, four sections, the theme switch and Contact. The active section is underlined, and a
  hairline under the bar fills with the reading position.
- **The section index** — on screens 1400px and wider, numbers 01–05 down the left edge, each with
  a line that fills as its section is read. Labels show on hover. It stays out of the hero.
- **The dock** — on phones the section links move into a dock at the bottom, under the thumb. The
  current section is filled in.

All three read the same thing: the section under a reading line a third of the way down the
window, from `window.Scroll`'s anchors.

### On phones

Everything for phones sits in `@media screen and (max-width: 767px)` (and `400px` in
`project.css`). The desktop never sees it, and neither does the print CV: a printed page is
narrower than 767px, which is why these blocks say `screen`.

- **Thumb-sized targets** — the bar's icons, the trace questions, the viewer's buttons and the
  Side quests button are 44px tall.
- **The agent concepts** become a row of cards to swipe through, the next card peeking in from the
  edge.
- **Side quests** — the row with "Back to work" stays at the top while the panel scrolls (a phone
  has no Esc key). Each quest becomes a compact row: the icon on the left, the status over the
  title.
- **The photo log** — two columns; the last sport photo spans both, so the row ends flush. In the
  viewer, a swipe sideways moves to the next photo.
- **Project pages** — the dock starts with a way back ("← All work"). Below 400px the bar button
  uses its short label (`.bar__short`) and the way back shows only its arrow. A diagram says
  "Swipe sideways to see all of it" above itself.

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

The home page loads `home.css`, `js/scroll.js` and `js/home.js`. A project page loads the same
three, plus `project.css` and its own sheet (and PM-OS adds `js/graph.js`). So a project page has
the home page's bar, section index, dock, type, hairlines and motion: its sections are whatever
its `data-nav` links point at, its section labels are the home page's numbered `.meta` labels, its
title rises word by word, and its ticker is the same word strip. Its own sheet sets `--accent`,
`--accent-soft` and, where a brand needs it, `--accent-2` and `--on` (dark text when the accent is
too light for white).

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
home.css          # the system: tokens, type, bar, dock, index, sections, motion — every page
js/home.js        # every page's behaviour: reveals, hero, counters, strip, accordions, trace, nav
tabiya/           # /tabiya/  — the chess coach and its AWS diagram
pm-os/            # /pm-os/   — the zones, the routines, the graph view
team-context/     # /team-context/ — the MCP tool surface and its security boundary
project.css       # what every project page adds on top of home.css: header, facts, leads, notes, diagrams
tabiya.css        # what Tabiya adds: accents, lockup, screenshots
pm-os.css         # what PM-OS adds: accents, graph frame, zone cards, routine list
team-context.css  # what the MCP page adds: accents, tool grid, the allow/deny gate
js/scroll.js      # the single scroll driver: metrics, anchors, progress, one rAF loop
js/graph.js       # the generated Obsidian-style graph on the PM-OS page (that page only)
dev-server.py     # no-cache static server for development
```

`js/scroll.js` must load before any script that consumes `window.Scroll`. It builds `SECTION_IDS`
from the page's own `data-nav` links, so each page declares its sections in its markup.

`styles.css`, `js/ui.js`, `js/scene.js`, `js/icons.js`, `js/carousel.js` and `assets/portrait.jpg`
belong to the older glass design. No page loads them any more.

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
4. **Phones change only phones.** Put phone rules in a `screen and (max-width: …)` block, keep
   new markup hidden by default, and never split a desktop label into spans inside a `.btn` (it
   is a flex box, so each span becomes a flex item and the gap moves the text).
5. **Cache busting.** GitHub Pages lets browsers keep a file for ten minutes, so a deploy could pair
   a new page with an old stylesheet. Every CSS and JS link carries a `?v=` stamp; change it on
   every page whenever a stylesheet or a script changes.

## Editing content

All copy lives in the HTML. The palette is the block of variables at the top of `home.css`:
`--accent` (blue), `--accent-soft` (its lighter step), `--accent-2` (orange) and `--on`, the text
colour on an accent fill. Change `--accent` and the whole page follows; a project page overrides
them on its `body` class.
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

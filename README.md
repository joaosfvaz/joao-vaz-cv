# João Vaz — Personal Website

A single-page personal site built from my CV. Dark, tech-forward, and scroll-told: a live
Three.js scene renders a breathing iridescent "crystal core" that acts as the narrator. It leads
the hero, steps back behind the copy while you read, wakes up for the building section, and returns
to meet you at the contact — wrapped in orbiting rings and a drifting particle field.

## Highlights

- **3D hero object + background** — one WebGL scene (`js/scene.js`): a custom vertex-displacement
  shader crystal, a wireframe shell, three orbiting rings, and ~1,400 additive particles.
- **One scroll driver** — `js/scroll.js` is the only reader of scroll position. It samples
  `scrollY` once per animation frame, caches layout metrics on resize, publishes normalised
  per-section progress, and runs a single `requestAnimationFrame` loop that both the 3D scene and
  the DOM effects subscribe to. Nothing else binds a scroll listener for motion.
- **Scrollytelling** — the crystal holds one pose per section and travels only between them;
  a readability veil rises while you read and clears at both ends; the hero copy lifts and dims as
  it leaves; the experience timeline draws its spine as you read, sticks each date beside its role,
  and lights the entry under the reading line.
- **Interactive on hover** — pointer-tracking card tilt + glow, lifting stat tiles, animated
  buttons and contact links.
- **Entrance** — the hero name rises out of its own mask on load; sections reveal as a staggered
  run of beats rather than one block.
- **Visual enumerations** — no plain text lists. Skills render as branded icon chips (Claude,
  Cursor, Jira, GraphQL, New Relic, Postman, GA4, Maze…), experience carries the **OLX Group**
  lockup (circular "G" symbol + OLX wordmark), and education shows the real **University of Minho**
  and **TU Graz** logos on light tiles, with circular flag badges for languages. Everything is
  inline SVG (`js/icons.js`), so there's no runtime network dependency for the icons.

  Brand marks: tool icons from [Simple Icons](https://simpleicons.org) (CC0); the University of
  Minho and TU Graz logos from Wikimedia Commons; the OLX Group circular symbol reconstructed as
  SVG. Used to identify the respective employer/institutions.
- **Tasteful palette** — near-black background with a controlled electric-blue → violet → teal
  accent gradient. Colourful, not loud.
- **Accessible** — `prefers-reduced-motion` takes an explicit branch, not a stripped animation:
  the scroll loop never starts, the scene draws one static frame, and every sequence renders at its
  end state. Sticky positioning and the reveal blur are dropped below 820px, and the crystal is
  scaled to fit and moved clear of the title on phones.

## Run it

```bash
cd ~/ai-projects/personal-website
python3 dev-server.py 4599
# open http://localhost:4599
```

`dev-server.py` is `http.server` with `Cache-Control: no-store`, so an edit is always the thing the
browser runs. Any other static server works too.

Three.js loads from a CDN via an import map, so an internet connection is needed on first view.

## Structure

```
index.html      # markup + content (from the CV)
styles.css      # all styling, animations, responsive rules
js/scroll.js    # the single scroll driver: metrics, progress, one rAF loop
js/scene.js     # Three.js 3D hero + background, posed per section (ES module)
js/ui.js        # reveals, counters, veil, timeline, nav state, card tilt
js/icons.js     # inline-SVG icon system (brand marks + custom badges)
dev-server.py   # no-cache static server for development
```

Load order matters: `js/scroll.js` must define `window.Scroll` before `js/ui.js` and `js/scene.js`
consume it.

## Tuning the scroll story

The crystal's choreography is the `POSES` table near the bottom of `js/scene.js` — one row per
section, giving position, scale, surface amplitude, ring opacity, palette shift, rim glow and
camera distance. Edit a row to change what that section feels like. `computeLayout()` turns each
section into an *arrive* and a *hold* stop, so a pose settles while you read and only travels
between sections.

## Editing content

All copy lives in `index.html`. Accent colours are CSS variables at the top of `styles.css`
(`--accent`, `--accent-2`, `--accent-3`); the 3D scene reads the same three colours near the top
of `js/scene.js` — keep them in sync if you retheme.

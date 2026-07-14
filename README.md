# João Vaz — Personal Website

A single-page personal site built from my CV. Dark, tech-forward, and interactive: a live
Three.js scene renders a breathing iridescent "crystal core" that reacts to the mouse and recedes
as you scroll, wrapped in orbiting rings and a drifting particle field.

## Highlights

- **3D hero object + background** — one WebGL scene (`js/scene.js`): a custom vertex-displacement
  shader crystal, a wireframe shell, three orbiting rings, and ~1,400 additive particles.
- **Interactive on scroll** — the crystal drifts, scales down and recedes; sections reveal on
  enter; stat counters animate; a top progress bar and active-nav highlight track position.
- **Interactive on hover** — pointer-tracking card tilt + glow, lifting stat tiles, animated
  buttons and contact links. The hero title gently floats.
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
- **Accessible** — respects `prefers-reduced-motion` (static frame, no counters/tilt) and is fully
  responsive down to mobile.

## Run it

Any static server works. For example:

```bash
cd ~/ai-projects/personal-website
python3 -m http.server 4599
# open http://localhost:4599
```

Three.js loads from a CDN via an import map, so an internet connection is needed on first view.

## Structure

```
index.html      # markup + content (from the CV)
styles.css      # all styling, animations, responsive rules
js/scene.js     # Three.js 3D hero + background (ES module)
js/ui.js        # scroll reveals, counters, nav state, card tilt
js/icons.js     # inline-SVG icon system (brand marks + custom badges)
```

## Editing content

All copy lives in `index.html`. Accent colours are CSS variables at the top of `styles.css`
(`--accent`, `--accent-2`, `--accent-3`); the 3D scene reads the same three colours near the top
of `js/scene.js` — keep them in sync if you retheme.

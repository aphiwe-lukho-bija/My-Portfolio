# Aphiwe Lukho Bija — Portfolio

A luxury, cinematic software development portfolio: Swiss precision in dark walnut, ebony,
ivory, brushed titanium and antique brass. Vue 3 + Vite, with a live WebGL background and an
optional playable 3D chess game ("The Next Move").

```bash
npm install
npm run dev      # develop
npm run build    # production build into dist/
```

## Where things live

| What | File |
| --- | --- |
| **All text, links, projects, skills, experience** | `src/data/portfolio.js` |
| Design system (colours, type, spacing, layout) | `src/style.css` |
| Living background (WebGL shader + CSS fallback) | `src/components/LivingBackground.vue` |
| Navigation, hero, sections | `SiteNav.vue`, `HomeView.vue`, `TextPage.vue`, `ProjectsView.vue`, `SkillsView.vue`, `ExperienceView.vue`, `GalleryView.vue`, `ContactView.vue`, `SiteFooter.vue` |
| Chess dialog (loads chess on demand, Back button, Esc, focus) | `src/components/ChessGate.vue` |
| Chess 3D scene and interaction | `src/components/ChessExperience.vue` |
| Chess rules and computer opponent | `src/chess/engine.js`, `src/chess/ai.worker.js` |
| Chess piece models, textures, stage | `src/chess/pieces.js`, `src/chess/stage.js` |

## Placeholders

Anything not yet filled in shows a dashed brass **Placeholder** tag. They are all in
`src/data/portfolio.js` (search for `placeholder`):

- the repository and live-site links of the portfolio case study
- the company name of the current internship

Set `SHOW_PLACEHOLDERS = false` at the top of that file to hide them all. Nothing on the site
is invented: every entry comes from the original site or CV details.

## Design notes

- **Background:** one fragment shader in plain WebGL (no 3D library). It renders at reduced
  resolution, caps to 30 fps on weaker or touch devices, lowers its own resolution if frames run
  slow, stops when the tab is hidden or the chess scene is open, and falls back to animated CSS
  gradients without WebGL. With "reduce motion" it shows a single still frame.
- **Chess:** Three.js is only downloaded when a visitor opens it. The computer opponent runs in
  a Web Worker. Click, tap or keyboard (arrow keys + Enter); drag to orbit, scroll or pinch to
  zoom; Esc or "Back to Portfolio" to leave. Pawns promote to a queen automatically.
- **Fonts:** Newsreader and Hanken Grotesk load from Google Fonts (`index.html`). To self-host
  them, install `@fontsource-variable/hanken-grotesk` and `@fontsource-variable/newsreader`.
- **Theme:** the old light/dark toggle was removed; the cinematic background is dark by design.

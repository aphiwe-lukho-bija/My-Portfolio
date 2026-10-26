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

- the live-site link of the portfolio case study
- the company name of the current internship

Set `SHOW_PLACEHOLDERS = false` at the top of that file to hide them all. Nothing on the site
is invented: every entry comes from the original site or CV details.

## Contact form

Messages are delivered to `person.email` through Web3Forms, so they arrive in the inbox without
opening the visitor's mail app.

1. Get a free access key at [web3forms.com](https://web3forms.com) using the portfolio email.
2. Copy `.env.example` to `.env.local` and paste the key into `VITE_WEB3FORMS_ACCESS_KEY`.
3. Restart the dev server (or rebuild) so Vite picks up the new variable.

`.env.local` is gitignored, so the key is never committed. If no key is set, or the request
fails, the form falls back to a `mailto:` link so a message is never lost.

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

## Opening film (intro)

A silent full-screen film plays first; near its end the portfolio rises underneath while the film
dissolves. A "Skip intro" button (or Esc) skips it at any time.

| What | File |
| --- | --- |
| The film layer, skip button, hand-over timing | `src/components/IntroSplash.vue` |
| Wiring (once per session, reduced motion) | `src/App.vue` |
| Page rise / fade while the film hands over | `src/style.css` ("INTRO HAND-OVER") |
| The film file (you add it) | `public/intro/intro.mp4` |
| Blender script that builds and renders the film | `blender/make_intro.py` |

- Plays once per browser session. `?intro` in the address replays it, `?nointro` skips it.
- Visitors with "reduce motion" never see it. If the file is missing, fails to load or autoplay is
  blocked, the site just appears.
- Timing lives at the top of `IntroSplash.vue` (`REVEAL_LEAD` = seconds before the end that the page
  starts to rise).

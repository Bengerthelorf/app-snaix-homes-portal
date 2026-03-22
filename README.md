# app.snaix.homes

Landing page and project portal for [Bengerthelorf](https://github.com/Bengerthelorf)'s open source tools.

## Stack

- **Astro** — static site generation
- **Tailwind CSS v4** — styling
- **Cloudflare Workers** — API proxy, install scripts, docs proxy, analytics
- **WebGL** — animated aurora background

## Development

```bash
npm install
npm run dev          # local dev server at localhost:4321
npx astro build      # build static site to ./dist/
npx wrangler deploy  # deploy Worker + static assets to Cloudflare
```

## Adding a project

Edit `src/data/projects.ts` — add an entry to the `projects` array. Add a preview slot in `src/pages/index.astro` if using a new preview type.

## Structure

```
src/
  data/projects.ts        # single source of truth for all project metadata
  components/
    ProjectCard.astro      # reusable project card
    Aurora.astro           # WebGL aurora background
    icons/                 # SVG icon components
  layouts/Layout.astro     # base HTML layout with meta tags
  pages/index.astro        # landing page
  styles/global.css        # Tailwind v4 theme + component styles
worker/
  index.ts                 # Cloudflare Worker (API, proxy, analytics)
```

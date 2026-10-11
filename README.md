# LD Browser

A browser-only Linked Data browser. Enter a URI; the page fetches its RDF directly from the browser,
shows it as tables, and lets you follow the links. There is no server: only sources that allow
cross-origin reads (CORS) can be loaded.

The first target is [RailClass](https://nakamura196.github.io/railclass/) and Wikidata.

Inspired by Masahide Kanzaki's [LD Browser](https://web.archive.org/web/20250401124432/http://www.kanzaki.com/works/2014/pub/ld-browser) (2014).
This is a separate implementation, not his tool.

## Run locally

```
npm ci
npm run dev
```

Then open http://localhost:4321/ . `npm run build` writes static files to `dist/`.
The pages (`src/pages/`, shared header and footer in `src/layouts/Base.astro`) are built by Astro;
the browser scripts in `public/app/` are served unchanged.

## Publish

The site is at https://browser.ldas.jp/ (custom domain, `public/CNAME`).
`zsh scripts/deploy-pages.zsh` (on main) builds locally and force-pushes `dist/` to the `gh-pages` branch,
which GitHub Pages serves. No Actions workflow is used.

## Files

- `src/pages/index.astro` — top page; `browse.astro` — the browser; `about.astro` — about

- `public/app/resolve.js` — URI → where to fetch its RDF (RailClass, Wikidata, a few vocabularies)
- `public/app/fetchrdf.js` — fetch and parse (Turtle, N-Triples, JSON-LD, RDF/XML, HTML)
- `public/app/rdfxml.js` — RDF/XML parser on the browser's own DOMParser
- `public/app/labels.js` — names for URIs (ja / en)
- `public/app/render.js` — tables, nesting, in-place expansion
- `public/app/html.js` — RDF embedded in HTML: JSON-LD, microdata, RDFa
- `public/app/graph.js` — a small graph drawing per table (up to 300 triples)
- `docs/notes/ld-browser.md` — lab note (Japanese)

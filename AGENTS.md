# Repository Guidelines

## Project Structure & Module Organization
- `content/` stores Markdown entries with TOML front matter; add homilies as `content/homilies/<slug>/index.md` and reflections in `content/reflections/` (use `hugo new` to scaffold).
- `assets/` holds pipeline-managed CSS/JS, while `static/` keeps pass-through assets; leave the generated `public/` directory untouched.
- `themes/latex_fradamroyal/` contains the customized LaTeX theme; keep template, partial, shortcode, and archetype work here.
- `layouts/` is for repo-level overrides (for example `layouts/robots.txt`).

## Build, Test, and Development Commands
- `hugo server -D` runs the local preview with drafts enabled and auto-reload for content and theme assets.
- `hugo --gc --minify` creates a production bundle, prunes orphaned files, and surfaces template errors; run before release.

## Coding Style & Naming Conventions
- Front matter stays in TOML (`+++ ... +++`) with lowercase keys, ISO 8601 dates, and `draft = true` until publication; title case appears only in `title`.
- Hugo templates and HTML use four-space indentation and explicit whitespace trimming (`{{- … -}}`); CSS and JS within `assets/` use two spaces.
- Keep `assets/css/site.css` as an import-only manifest; place styles in dedicated CSS files and import them from `site.css`.
- Place reusable fragments in `themes/latex_fradamroyal/layouts/_partials/` with descriptive names (e.g., `featured-homilies.html`). Keep shortcodes in `themes/latex_fradamroyal/layouts/_shortcodes/`.

## Template Engine Update
- Hugo v0.146+ resolves layouts by the full `Page.Path`; prefer placing specialized templates deeper in the tree (e.g. `layouts/homilies/single.html`) instead of front matter overrides.
- Partial and shortcode directories now use leading underscores (`_partials`, `_shortcodes`). Keep new snippets there so Hugo loads them without warnings.
- Use the new `all` layout only for site-wide overrides; otherwise inherit from `baseof.html`.

## Site Architecture Guardrails
- Keep document titles, descriptions, canonical URLs, social metadata, and JSON-LD on the shared resolvers used by `themes/latex_fradamroyal/layouts/_partials/head.html`; do not duplicate their fallback logic in individual layouts.
- Preserve self-referential canonical URLs for every indexable page, including paginator pages. When changing pagination, update the page context before the head renders and keep `tests/canonical-links.test.js` passing.
- Keep year archives and exact shared-Scripture related homilies as the site's collection paths. `liturgical_season` and `liturgical_occasion` are controlled, non-indexable metadata and must not automatically create taxonomy, term, season, occasion, or other thin collection pages.
- Keep taxonomy and term output disabled unless a deliberate, reader-useful collection architecture and its generated-output coverage are added at the same time.
- Preserve synchronization between visible breadcrumbs, article navigation, canonical URLs, sitemap entries, feeds, social metadata, and structured data. Add generated-output regressions whenever changing these surfaces.
- Keep the custom 404 page out of the sitemap, marked `noindex`, and free of canonical and page-level structured data.
- Treat authored semantic images as content: require descriptive alt text plus an exact local image target or explicit HTTPS source; image-led articles also require resolvable structured image metadata. Decorative images must be explicitly marked with empty alt text.

## Testing Guidelines
- Watch `hugo server` for broken links, missing resources, or template warnings.
- Run `hugo --templateMetrics --templateMetricsHints` to spot slow-rendering templates.
- Run `node --test tests/bible-reading-plan.test.js tests/bible-reading-plan-exports.test.js tests/structured-data.test.js tests/canonical-links.test.js` for the browser-side Bible planner and generated metadata.
- Run `node --test tests/navigation.test.js` for year archives, breadcrumbs, adjacent-article navigation, crawl depth, and generated internal links.
- Run `node --test tests/content-model.test.js` for the controlled liturgical metadata contract and archetype prompts.
- Validate the generated `public/` (or deploy preview) for layout and typography regressions.

## Commit & Pull Request Guidelines
- Follow the repository’s existing imperative, sentence-case commits (`Add Advent reflection`, `Update footer links`) and keep changes scoped.
- Keep the built `public/` directory out of version control; commit updated theme assets whenever source CSS/JS changes.
- Pull requests should summarize intent, note affected sections, and attach before/after screenshots for visual tweaks; link related issues when available.

## Content Contribution Tips
- Follow `CONTENT-MODEL.md` for `liturgical_season` and `liturgical_occasion`; keep generic `categories`, `tags`, and `series` unused while taxonomy output is disabled.
- Article dates must be either `YYYY-MM-DD` or full RFC 3339 timestamps with `Z` or an explicit numeric offset; the date's civil year must match the article's year directory.
- Use `seo_title` only when a document title should differ from the visible `title`; provide the unbranded page-specific text and let the centralized resolver append the site name.
- Give every new page a concise, accurate `description` for search results; use `summary` separately when list or card copy should differ.
- Prefer SBL book abbreviations for Scripture references, including homily `readings` metadata; use the canonical list in `SBL_BIBLE_ABBREVIATIONS.md`.
- Do not hand-author JSON-LD in content; use ordinary front matter and maintain its centralized mapping in `layouts/_partials/structured-data.html`.
- Store supporting media under `static/images/<slug>/` and reference them via relative paths in Markdown to ensure Hugo copies them intact.

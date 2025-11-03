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
- Place reusable fragments in `themes/latex_fradamroyal/layouts/_partials/` with descriptive names (e.g., `featured-homilies.html`). Keep shortcodes in `themes/latex_fradamroyal/layouts/_shortcodes/`.

## Template Engine Update
- Hugo v0.146+ resolves layouts by the full `Page.Path`; prefer placing specialized templates deeper in the tree (e.g. `layouts/homilies/single.html`) instead of front matter overrides.
- Partial and shortcode directories now use leading underscores (`_partials`, `_shortcodes`). Keep new snippets there so Hugo loads them without warnings.
- Use the new `all` layout only for site-wide overrides; otherwise inherit from `baseof.html`.

## Testing Guidelines
- Watch `hugo server` for broken links, missing resources, or template warnings.
- Run `hugo --templateMetrics --templateMetricsHints` to spot slow-rendering templates.
- Validate the generated `public/` (or deploy preview) for layout and typography regressions; no automated tests yet.

## Commit & Pull Request Guidelines
- Follow the repository’s existing imperative, sentence-case commits (`Add Advent reflection`, `Update footer links`) and keep changes scoped.
- Keep the built `public/` directory out of version control; commit updated theme assets whenever source CSS/JS changes.
- Pull requests should summarize intent, note affected sections, and attach before/after screenshots for visual tweaks; link related issues when available.

## Content Contribution Tips
- Use taxonomy arrays (`categories = []`, `tags = []`, `series = []`) to keep navigation consistent and discoverable.
- Store supporting media under `static/images/<slug>/` and reference them via relative paths in Markdown to ensure Hugo copies them intact.

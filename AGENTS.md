# Repository Guidelines

## Project Structure & Module Organization
- `content/` stores Markdown entries with TOML front matter; Ignore this directory as it contains no code.
- `assets/` contains pipeline-managed CSS/JS, while `static/` holds pass-through files such as fonts and uploaded images produced by the theme; keep generated output in `public/` untouched.
- `themes/latex_fradamroyal/` houses the customized LaTeX theme. Update partials, templates, and archetypes here so upgrades remain centralized.
- `layouts/` is reserved for repo-level overrides (for example `layouts/robots.txt`). Mirror the current indirection pattern before adding new overrides.

## Build, Test, and Development Commands
- `hugo server -D` runs the local preview with drafts enabled and auto-reload for both content and theme assets.
- `hugo --gc --minify` creates a production-ready bundle, prunes orphaned files, and surfaces template errors. Run this before any release or deploy.

## Coding Style & Naming Conventions
- Front matter stays in TOML (`+++ ... +++`) with lowercase keys, ISO 8601 dates, and `draft = true` until publication; title case appears only in `title`.
- Hugo templates and HTML use four-space indentation and explicit whitespace trimming (`{{- … -}}`); CSS and JS within `assets/` use two spaces.
- Place reusable fragments in `themes/latex_fradamroyal/layouts/partials/` with descriptive filenames (e.g., `featured-homilies.html`).

## Testing Guidelines
- Monitor `hugo server` output for broken links, missing resources, or template warnings during development.
- Run `hugo --templateMetrics --templateMetricsHints` when adjusting partials to spot slow-rendering templates.
- Validate the generated `public/` directory (or deploy preview) for layout and typography regressions; no automated test suite exists yet.

## Commit & Pull Request Guidelines
- Follow the repository’s existing imperative, sentence-case commits (`Add Advent reflection`, `Update footer links`) and keep changes scoped.
- Keep the built `public/` directory out of version control; include regenerated theme assets whenever source CSS/JS changes.
- Pull requests should summarize intent, list affected sections, and attach before/after screenshots for visual tweaks; link related issues or content requests where possible.

## Content Contribution Tips
- Use taxonomy arrays (`categories = []`, `tags = []`, `series = []`) to keep navigation consistent and discoverable.
- Store supporting media under `static/images/<slug>/` and reference them via relative paths in Markdown to ensure Hugo copies them intact.

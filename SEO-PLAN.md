# SEO Improvement Plan

## Objective

Improve the durable search visibility, discoverability, and presentation of
`fradamroyal.com` without rewriting strong original content for search engines
or pursuing short-lived SEO tactics.

The work should preserve the site's people-first character while ensuring that
search engines receive correct indexing signals, readers can reach older
content easily, and authorship and page purpose are clear.

## Working principles

- Fix indexing and deployment correctness before editorial optimization.
- Optimize for readers and genuine navigation tasks, not keyword density or a
  target word count.
- Prefer a small number of useful archive and topic pages over thin taxonomies.
- Preserve established URLs unless a change has a clear user benefit and a
  permanent one-to-one redirect is provided.
- Use Search Console and real-user data to prioritize later work; do not chase
  generic SEO or Lighthouse scores without evidence.
- Keep structured data accurate, visible-content-aligned, and restrained.
- Validate generated HTML and the deployed site, not only Hugo source files.

## Audit baseline

Baseline recorded July 12, 2026:

- 143 regular pages: 130 homilies, 11 reflections, one tool, and About.
- The local production build succeeds with 161 pages, 92 paginator pages, and
  seven aliases.
- The public deployment is behind local `main`; locally completed metadata,
  structured data, Tools, and accessibility changes are not all live.
- Canonical elements include `type="text/html"`, which current Google guidance
  says is not used for canonicalization.
- Paginated archives canonicalize to page one instead of self-canonicalizing.
- `pagination.pagerSize` is three; the oldest homilies can be roughly 45 clicks
  from the homepage.
- Source content contains only one contextual internal link.
- No regular page defines `description`; only ten define `summary`.
- Recurring feast titles produce at least 18 duplicate document-title pairs.
- Only two homilies contain structured `[[readings]]` metadata.
- Tags, categories, and series are enabled but unused; their empty roots and the
  empty Posts section are included in the sitemap.
- About contains only one generic sentence, and articles have no visible linked
  author byline.
- Ordinary content pages are lightweight and server-rendered. Field Core Web
  Vitals have not yet been established.
- The generated-site link audit found no broken internal links.
- Existing structured-data and Bible-planner tests pass.

## Execution queue

### NOW: Use post-deployment evidence to choose the next editorial slice

Phases 1.3, 1.4, 2.1, the first-priority Phase 2.2 description convention,
Phase 2.3, Phase 2.4, and all five bounded Phase 3.3 presentation slices are
implemented and verified locally. Deployment, live smoke-testing, and live
metadata validation remain pending and were intentionally skipped. The Phase
3.1 Scripture backfill and Phase 3.2 controlled-metadata backfill are complete
for all 130 published homilies without creating new collection pages. At the
author's direction, the homepage remains free of body-level introduction copy.
The legacy reflection hierarchy is normalized, and corpus-wide source and
rendered heading checks now pass. The two `Two Resurrections` images have
accurate, descriptive alt text and captions limited to supported facts. The
archived Lempertz record listed the historical panel as Hans Schäufelein's `Der
Auferstandene Christus`, created substantially after 1508 and auctioned as lot
1138 in 2007; a later Christie's record qualifies the work as attributed to
Schäufelein and cites it under rejected attributions, so the visible caption now
uses that qualified wording and links both records. The contemporary PNG's
embedded Content Credentials identify GPT-4o in ChatGPT and trained-algorithmic
media. Neither source establishes a reusable license for the exact file, and
the credential does not establish a defensible creation date, so no such claims
were added.

Phase 3.4 image linting is now generalized over authored main content rendered
by Hugo and Goldmark, including drafts and future or expired content, so figure
shortcodes and every supported Markdown image form are covered without
maintaining a second Markdown parser or mistaking code examples for images.
Non-decorative figures and inline images with authored alt text are treated as
semantic: they require an explicit alt attribute, descriptive nonblank alt text,
and either an exact generated image-file target or an explicit HTTPS source.
Intentionally decorative images outside figures and explicitly decorative
figures may use `alt=""`; theme assets outside main content are not treated as
authored semantic images. Articles led by a semantic figure must expose explicit
HTTPS structured image metadata that also resolves to an image file when local,
without tests depending on Hugo's fingerprinted filenames or freezing the
current inventory. The exact provenance, captions, asset bytes and order, page
URL, summary, feed copy, social images, and structured-data images for `Two
Resurrections` remain protected.

Phase 3.4 Scripture linting now derives all 74 accepted tokens for the 73-book
Catholic canon directly from `SBL_BIBLE_ABBREVIATIONS.md`, including the
parenthetical `Pss` alias. It validates all 550 authored reading records across
131 homilies and reflections, including unpublished content, and requires
exactly one nonblank label and citation per record without imposing a fixed
reading count or label vocabulary. The grammar covers whole chapters,
one-chapter books, comma and semicolon parts, verse suffixes, cross-chapter
ranges, multiple psalms, and the parenthetical Esther syntax used by the Bible
planner. Focused fixtures reject incomplete records, duplicate fields, unknown
book tokens, ASCII, dangling, or descending ranges, malformed locators, and
arbitrary parenthetical annotations. The corpus had no parenthesized authored
reading value. Its one ASCII range was corrected explicitly to an en dash in
source; no template or runtime normalization was added. Visible and structured
readings still agree, related-homily selection is unchanged, and reading data
remains absent from summaries, previews, and feeds.

Phase 3.4 required-front-matter linting now validates exactly one page-level,
nonblank title, valid article date, and Boolean draft status across all 141
authored homilies and reflections. It reads source files directly without
filtering by publication state, and focused fixtures cover published, draft, future, and
expired articles plus malformed fields and nested-table mistakes. All 141
legacy articles that lack descriptions are enumerated in a sorted, auditable
baseline. A new omission fails, and the exact comparison also fails when a
backfilled, removed, or renamed article leaves a stale exception. Generated
Homily and Reflection archetypes are checked for their required blank
description prompt and valid core fields. No legacy descriptions were
mechanically backfilled, and rendered metadata behavior is unchanged.

Phase 3.4 article-date linting now accepts calendar dates in `YYYY-MM-DD` form
and full RFC 3339 timestamps only when they carry a known `Z` or numeric offset.
It rejects offsetless timestamps and the RFC 3339 unknown-offset form `-00:00`,
and it requires each article's lexical civil year to match its year directory.
The two Christmas 2025 homilies now carry the source-appropriate `-06:00`
offset, and the August 2025 Franciscan reflection carries `-05:00`; their civil
dates and visible formatting are unchanged. Focused source and generated-output
coverage preserves the exact JSON-LD `datePublished` and RSS `pubDate` values,
the Christmas Day-before-Night archive order, and both pages' adjacent
navigation. URLs, date templates, Git-derived `lastmod` resolution, existing
known offsets, and unrelated content remain unchanged.

Recurring-occasion collection pages are no longer planned. Existing year
archives and exact-Scripture related-homily links remain the intended discovery
paths for those articles. Legacy-description backfill also remains paused until
search or reader evidence identifies a useful target. The next evidence-
gathering boundary is to deploy the verified candidate, validate its live
metadata, and establish Search Console and Bing baselines. Deployment and
external measurement remain out of scope until separately requested; no
additional speculative local SEO expansion is queued.

## Phase 0 — Correct indexing signals and deploy the intended site

**Outcome:** Search engines and readers receive the intended current site with
valid, consistent canonical signals.

**Status:** Phase 0.1 through 0.4 are implemented, deployed, and verified. Google
URL Inspection remains a post-deployment measurement task.

### 0.1 Fix canonical elements

- Remove `type="text/html"` from every canonical element.
- Give every paginated URL its own absolute, self-referential canonical.
- Keep single pages, section roots, and the homepage self-canonical.
- Ensure sitemap URLs, internal links, redirects, and canonical URLs agree.

### 0.2 Add generated-output tests

Test at least:

- Homepage canonical.
- A homily and a reflection canonical.
- Homilies and Reflections section-root canonicals.
- Home, Homilies, and Reflections pagination at multiple depths.
- Absence of `type`, `media`, `hreflang`, and `lang` on canonical links.
- Absolute HTTPS canonical URLs.

### 0.3 Verify the deployment candidate

- Run the production Hugo build and all Node tests.
- Check generated metadata, JSON-LD, RSS, sitemap, and internal links.
- Confirm the worktree contains only intended changes.

### 0.4 Deploy and smoke-test

Completed after deployment: the homepage, newest homily, deep pagination,
Tools pages, robots file, and sitemap matched the local production output
byte-for-byte. Their status codes and metadata were correct, and a missing URL
returned HTTP 404.

- Publish the intended `main` branch after Phase 0.1–0.3 pass.
- Verify live responses for:
  - Homepage.
  - Newest homily.
  - A deep paginated archive.
  - `/tools/`.
  - `/tools/bible-reading-plan/`.
  - `/robots.txt`.
  - `/sitemap.xml`.
  - A missing URL and its 404 status.
- Inspect canonical, description, JSON-LD, and generator version in live HTML.

### Phase 0 gate

- [x] Canonical elements have no disqualifying attributes.
- [x] Every indexable pagination page self-canonicalizes.
- [x] Canonical regression tests pass.
- [x] Production build and existing tests pass.
- [x] Local and deployed representative pages match.
- [ ] Google URL Inspection selects the intended canonical on sampled URLs.

## Phase 1 — Repair information architecture and crawl paths

**Outcome:** Important content is reachable through clear, useful navigation in
approximately three clicks rather than dozens of sequential archive pages.

**Status:** Phase 1.1 and 1.2 are implemented, deployed, and verified live.
Phases 1.3 and 1.4 are implemented and verified locally; deployment is pending.

### 1.1 Improve archive navigation

Implemented with a 12-item main archive page, compact unpaginated year indexes,
cross-year adjacent-article links, and visible breadcrumbs synchronized with
structured data. Current-year archives are present even when they contain only
one article, keeping year navigation consistent as those archives grow. The
production deployment was smoke-tested against the local build on July 12,
2026, including ordinary cached URLs, retired paginator 404s, and the
fingerprinted stylesheet.

- Increase the archive page size from three to roughly 10–15 after checking the
  resulting page length on mobile.
- Create useful year archives for Homilies and Reflections.
- Link year archives prominently from their section roots.
- Add previous/next article navigation to single pages.
- Add visible breadcrumbs that match `BreadcrumbList` structured data.

### 1.2 Add restrained related-content paths

Implemented as a maximum of three related homilies supported by exact shared
non-responsorial Scripture citations. Matches that share multiple readings are
shown before single-reading matches, every relationship names representative
shared citations, and pages without a defensible match render no
related-content block. Repeated liturgies consequently connect the same feast
or occasion across years when their readings coincide. Liturgical-season,
reflection, and tool relationships remain absent until explicit metadata can
support them accurately. The production deployment was smoke-tested against
the local build on July 13, 2026, including recurring-feast, multi-reading,
single-reading, and no-match homilies plus the fingerprinted stylesheet.

Where metadata supports accurate relationships, link to:

- The same feast or occasion in other years.
- Other content in the same liturgical season.
- Homilies sharing a Scripture passage or book.
- Closely related reflections or tools.

Do not add arbitrary automated links merely to increase link counts.

### 1.3 Remove low-value crawl surfaces

Implemented by removing the placeholder Posts source and disabling Hugo's
taxonomy and term output kinds. Generated-output coverage verifies that their
HTML, feed, and paginator files are absent; that they do not appear in the
sitemap; and that Home, About, canonical sections, Tools, every year archive,
and every article remain indexable and listed. Aggregate homepage and section
`lastmod` changes remain deferred because the current Git-backed dates cannot
reliably distinguish archive-visible child changes from metadata-only or
template changes.

- Remove or suppress the empty Posts section from indexable output and sitemap.
- Disable empty tag, category, and series outputs until a controlled taxonomy is
  actually used.
- Keep only canonical, index-worthy URLs in the sitemap.
- Make section and homepage `lastmod` values reflect significant child changes
  if those values can remain reliably accurate.

### 1.4 Improve error recovery

Implemented as a site-owned error page with a clear explanation and direct
links to Home, Homilies, Reflections, and Tools. The error document is excluded
from the sitemap, marked `noindex`, and emits neither a canonical URL nor
page-level structured data. Generated-output tests protect those invariants and
the host's `404-page` handling, while a local production server confirmed that
an unknown URL returns the custom body with HTTP 404.

- Add a useful custom `404.html` with links to Home, Homilies, Reflections, and
  Tools.
- Preserve the HTTP 404 status.

### Phase 1 gate

- [x] Important articles have a useful route of approximately three clicks.
- [x] Year archives work without thin or duplicate output.
- [x] Singles have previous/next navigation and visible breadcrumbs.
- [x] Related-content links are evidence-based and explain their relationship.
- [x] Empty Posts and taxonomy roots are absent from the sitemap.
- [x] The custom 404 is useful and still returns status 404.
- [x] Generated internal-link validation reports no broken links.

## Phase 2 — Improve search-result identity and transparent authorship

**Outcome:** Search results clearly identify the site, distinguish recurring
homilies, and give readers trustworthy author and page context.

**Status:** Phase 2.1, the first-priority Phase 2.2 description convention,
Phase 2.3, and Phase 2.4 are implemented and verified locally; deployment and
live validation are pending.

### 2.1 Establish title conventions

Implemented with a centralized document-title resolver and an optional,
unbranded `seo_title` front matter override. Home and the main sections now use
descriptive titles with a consistent author suffix, homily and reflection
singles receive accurate year context, and paginator depths identify their page
number. Visible H1s, URLs, navigation labels, RSS titles, and structured-data
headlines continue to use the ordinary `title` field.

- Replace the homepage document title with a descriptive title such as
  `Catholic Homilies and Reflections | Fr. Adam Royal`.
- Add an `seo_title` convention separate from the visible H1.
- Distinguish recurring homilies using year and, when useful, the central theme
  or readings.
- Keep titles natural and concise; do not impose an arbitrary character limit.
- Preserve existing H1s and URLs unless a separate editorial change is needed.

Example:

- Visible H1: `Pentecost`
- Document title: `Pentecost Homily: [Central Theme] (2026) | Fr. Adam Royal`

### 2.2 Establish description conventions

Implemented first for Home, About, Homilies, Reflections, Tools, and the Bible
Reading Plan with distinct, human-written search descriptions grounded in each
page's visible purpose. The shared resolver keeps head metadata and page-level
structured data aligned while preserving the existing `description` to
`summary` to generated-summary to site-description fallback for older content.
The Bible planner retains separate card and RSS summary copy. Project
archetypes now mark descriptions as required before publication; mechanical
enforcement remains part of Phase 3.4 content linting. Article backfill remains
measurement-led rather than speculative until impression data identifies the
right priorities.

- Add unique descriptions first to Home, About, Homilies, Reflections, Tools,
  and the Bible Reading Plan.
- Add human-written descriptions to high-impression or strategically important
  articles next.
- Require a description for new content while retaining a safe programmatic
  fallback for older content.
- Treat descriptions as accurate result summaries, not keyword containers.
- Keep `summary` available for on-site cards when it should differ from the
  search description.

### 2.3 Strengthen visible authorship

Implemented with an expanded About page grounded in the author's existing
first-person account and verified official sources from the Diocese of
Knoxville, its newspaper, Saint Meinrad, and St. Alphonsus. The biography now
covers his conversion, education, formation, ordination, prior assignments,
current pastorate, and deanery role alongside the site's pastoral purpose.
Every homily and reflection displays a centrally configured `By Rev. Adam
Royal` link to About, and generated-output tests verify that the visible name
and URL agree with the article's structured `Person` author. The diocesan
newspaper's person-specific ordination profile is the sole verified `sameAs`
identity URL; the parish's person page remains unused because its inherited URL
slug names a previous pastor.

- Expand About using accurate, user-supplied facts:
  - Biography and priestly or ministry role.
  - Relevant formation and experience.
  - Site purpose and intended audience.
  - Editorial approach to homilies, reflections, Scripture references, and
    tools.
  - Appropriate official or public identity links.
- Add a visible `By Rev. Adam Royal` link on article pages.
- Populate structured `sameAs` only with verified identity URLs.
- Ensure visible authorship and structured data agree.

### 2.4 Improve share and search presentation

Implemented with explicit favicon discovery and site-owned Open Graph and
Twitter Card metadata that reuses the centralized document title, description,
canonical URL, and image resolvers. Homily and reflection singles identify as
articles while other indexable pages identify as websites; paginator metadata
retains its page-specific title and canonical URL. `Two Resurrections` names
its two genuine page images explicitly, with the traditional painting first as
the preferred preview. No stock, favicon, or inferred body-image fallback is
used, and the noindex 404 emits no social metadata. Generated-output tests
verify these invariants across every indexable page. Deployment checks and live
validator runs remain pending and were intentionally skipped.

- Declare the existing favicon explicitly in the document head.
- Add Open Graph and Twitter Card metadata using the centralized title,
  description, canonical, and image resolvers.
- Add explicit `images` metadata to image-bearing content.
- Use genuine representative images rather than decorative stock imagery.
- Validate deployed structured data with Google Rich Results Test and the
  Schema.org validator.

### Phase 2 gate

- [x] Home and every main section have distinct titles and descriptions.
- [x] Recurring homilies have distinguishable document titles.
- [x] About provides real author and editorial context.
- [x] Articles contain a visible linked byline.
- [x] Favicon and social-preview metadata render correctly.
- [x] Structured data is valid and matches visible content.

## Phase 3 — Build durable editorial metadata and priority content

**Outcome:** New and important content carries enough accurate metadata to
support useful discovery by feast, season, year, and Scripture without creating
thin pages.

**Status:** Phases 3.1 and 3.2 are complete for the existing homily corpus. All
130 published homilies now have verified Scripture and controlled liturgical
metadata. Five bounded Phase 3.3 presentation slices are complete: legacy title
and canonical-slug cleanup, root and main-section introduction cleanup, legacy
reflection heading normalization, long-form structure for the illustrated `Two
Resurrections` reflection, and accurate image facts. Corpus-wide source and
rendered heading checks plus generalized authored-image, corpus-wide SBL
reading-record, required-front-matter, and article-date checks from Phase 3.4
are also implemented. Recurring-occasion collection pages are out of scope;
further editorial expansion now waits for post-deployment reader or search
evidence.

### 3.1 Backfill Scripture metadata

Completed for the existing corpus: all 130 homilies have nonblank
`[[readings]]` metadata using the repository's SBL citation convention.

- Backfill verified `[[readings]]` metadata newest-first.
- Prioritize pages with Search Console impressions, clicks, or recurring feast
  relevance.
- Use authoritative liturgical sources and SBL abbreviations.
- Preserve variable reading counts and partial backfill support.
- Continue keeping readings out of summaries, list previews, and RSS.

### 3.2 Introduce a controlled content model

The model definition is implemented in `CONTENT-MODEL.md` and the
machine-readable `data/content_model.json`. New homily and reflection
scaffolds expose the two authored fields, and corpus-wide tests protect the
contract. All 130 published homilies now carry one of the six controlled
seasons and one of 74 canonical occasion identifiers. The completed inventory
contains nine Advent, eleven Christmas, seventeen Lent, six Paschal Triduum,
nineteen Easter, and sixty-eight Ordinary Time homilies.

The backfill was reviewed from each page's date, title, and all 549 structured
reading records against the official USCCB 2024–2026 liturgical calendars and
daily-reading pages. Tests preserve the judgment-heavy normalizations,
including vigil and day forms, the Easter Vigil, transferred celebrations,
Sunday-displacing feasts, Saint Joseph the Worker during Easter, and the
pastorally titled `Called by Name Weekend`. Legacy display-title spelling and
`Per Annum` wording remain deliberately deferred to Phase 3.3 so this change
does not alter established presentation or URLs.

Focused generated-output tests require complete registry coverage with no
unused occasion values and compare the complete rendered site against the same
corpus with both authored fields removed. They prove that the metadata is
byte-neutral and that no raw metadata, feed content, or new indexable
collection URL is introduced.

Authored fields are deliberately limited to:

- `liturgical_season`: required for new homilies and optional for reflections,
  using six controlled season identifiers.
- `liturgical_occasion`: required for new homilies and optional for reflections,
  using a centrally registered canonical identifier rather than title text.

Calendar year remains derived from `date`; Scripture books and passages remain
derived from non-responsorial `[[readings]]` citations. A scalar lectionary
cycle is excluded because Sunday, weekday, fixed-proper, and multi-reading-set
pages cannot share one unambiguous value. Themes remain deferred until a small
editorial vocabulary and reader-demand evidence exist. Generic categories,
tags, and series remain unused with taxonomy output disabled.

The controlled fields remain non-indexable editorial metadata. Year archives
and exact-Scripture related-content paths provide the intended collection
surfaces; season and occasion metadata must not create additional pages.

### 3.3 Improve priority content presentation

The first bounded presentation slice is implemented. Twenty-four legacy
`Per Annum` titles now use `in Ordinary Time`, and the visible `Twelth` and
`Fifthteenth` spelling errors are corrected. At the author's direction, all 25
affected source filenames and canonical URLs now use matching corrected slugs.
Each former URL remains a one-to-one Hugo alias, and Hugo generates a root
Cloudflare `_redirects` manifest with direct HTTP 301 rules for both request
forms of each former path to its new canonical. Generated-output coverage
protects the corrected H1s, document titles, structured headlines, archive and
navigation labels, related links, feed items, sitemap entries, canonicals, and
redirect rules. Deployment and live redirect verification remain intentionally
deferred.

The root and main-section introduction cleanup slice is also implemented. The
placeholder root copy is removed, and the homepage deliberately remains
without a body-level introduction according to the author's visual and
editorial preference. The Homilies and Reflections roots explain their distinct
purposes and archive navigation in the author's preferred language. The shared
list template renders each section introduction once before the first archive
page's primary content without repeating it on paginator depths. Generated-
output coverage preserves the introduction-free homepage, existing year
introductions, one-H1 structure, article previews, and feeds.

The legacy reflection heading slice is implemented. Twenty-one body-level
Markdown H1s across three 2024 reflections are now 17 H2s and four H3s, with
the four `Lectio Divina` steps nested beneath their H2 introduction. Visible
wording, summaries, feeds, URLs, and navigation remain unchanged. Source tests
reject body-level H1s and skipped heading levels throughout the homily and
reflection corpus; generated-output tests require one title H1 on every article
and preserve the exact order and wording of the normalized headings.

The long-form reflection structure slice is implemented. `Two Resurrections`,
the site's only illustrated article and a 3,125-word unstructured outlier, now
uses six restrained H2s to mark its natural transitions from sacred
anachronism through recognizing Christ in the present. Every original
paragraph, the summary and feed copy, both figure shortcodes, the asset names
and order, and the social and structured-data image URLs remain unchanged.
Source and generated-output tests preserve the exact heading order, levels, and
wording alongside the corpus-wide hierarchy checks.

The image-facts presentation slice is implemented. The archived Lempertz
catalogue listed `painting_1.jpeg` as Hans Schäufelein's `Der Auferstandene
Christus`, placed the panel substantially after 1508, and recorded it as lot
1138 in the 19 May 2007 auction. A later Christie's record qualifies it as
attributed to Schäufelein and cites literature listing it under rejected
attributions, so the caption uses the more careful attribution and links both
records. Embedded Content Credentials in `painting_2.png` identify GPT-4o in
ChatGPT and trained-algorithmic media. These sources provide no reuse license
for the exact files, and the credential provides no defensible creation date,
so those unknown facts remain unstated. Both figures have accurate descriptive
alt text and factual captions. Source and generated-output tests preserve every
stated fact and the original asset hashes and order. Existing canonical and
structured-data tests continue to protect the page and image metadata surfaces,
while the source diff leaves page, summary, and feed behavior unchanged.

- Add useful section introductions to Homilies and Reflections.
- Remove the root placeholder and keep the homepage introduction-free according
  to the author's editorial preference.
- Convert body-level Markdown H1s to H2/H3 so pages have one primary H1.
- Add descriptive H2s to long articles where they improve reading and
  navigation.
- Correct visible spelling and title errors without changing established URLs
  solely for cosmetic reasons.
- Standardize older display titles such as `Per Annum` to `in Ordinary Time`
  when editorially appropriate, while preserving URL equity.
- Add image attribution, provenance, captions, and accurate alt text where
  images are central to the article.

### 3.4 Add content linting

Heading-hierarchy linting is implemented for the complete authored homily and
reflection corpus and for generated article output. Duplicate indexable-title
and generated internal-link checks are also implemented. Generalized generated-
output linting now covers semantic figure-shortcode and Markdown images across
authored main content through Hugo and Goldmark rather than an ad hoc Markdown
parser. A dedicated lint build includes draft, future, and expired pages. It
permits intentionally
decorative images, requires semantic images to have meaningful alt text and an
exact generated image target or explicit HTTPS source, and requires resolvable
structured image metadata on image-led articles. Exact provenance and asset-
integrity coverage remains in place for the site's only current image-led
article. SBL and reading-record linting derives its book vocabulary from the
canonical reference, validates every authored record, covers the Bible
planner's parenthetical Esther citation syntax with focused fixtures, and
rejects incomplete data or malformed citations. Required-front-matter linting
validates the core page fields across every authored article and requires
descriptions on new work while tracking legacy omissions in an exact auditable
baseline. Article-date linting accepts calendar dates or offset-qualified RFC
3339 timestamps, rejects ambiguous timestamp offsets, and requires civil years
to match source directories. Focused generated-output coverage preserves exact
publication timestamps and chronology for the three normalized legacy values.

Add automated checks or warnings for:

- Required title, date, draft status, and description on new content
  (implemented with an explicit legacy-description baseline).
- Duplicate SEO titles (implemented for indexable generated pages).
- Heading hierarchy (implemented).
- Broken internal links (implemented for generated HTML output).
- Missing or empty image alt text (implemented for semantic rendered images).
- Missing image metadata on image-led articles (implemented for structured
  output).
- SBL Scripture abbreviation and reading-data validation (implemented).
- Date/time consistency where precise publication times matter (implemented).

### Phase 3 gate

- [x] New content follows the metadata convention automatically.
- [ ] Priority and recent homilies have verified readings and descriptions.
- [x] Heading, link, image, Scripture, and article-date lint checks pass.
- [x] No metadata leaks into summaries or RSS against repository policy.

## Phase 4 — Measure, learn, and maintain

**Outcome:** Later SEO decisions are based on indexing, search demand, and real
user experience rather than generic audit scores.

### 4.1 Establish measurement

- Verify the domain in Google Search Console and Bing Webmaster Tools.
- Submit the cleaned sitemap to both services.
- Record a baseline for:
  - Submitted versus indexed URLs.
  - Google-selected canonical URLs.
  - Queries, impressions, clicks, CTR, and average position.
  - Branded versus non-branded discovery.
  - Rich-result validity.
  - Mobile and desktop Core Web Vitals.
- Inspect a sample of recent, old, image-bearing, tool, and pagination URLs.

### 4.2 Use seasonally appropriate comparisons

- Review technical indexing signals soon after deployment.
- Review search performance after four to eight weeks.
- Compare recurring liturgical content year-over-year or feast-over-feast;
  avoid treating normal liturgical seasonality as an SEO regression.
- Prioritize title and description improvements for pages with substantial
  impressions and below-expected CTR.
- Prioritize content and internal linking for relevant queries where rankings
  are close to the first page.

### 4.3 Measure performance before optimizing it

- Use Search Console field data as the primary Core Web Vitals source.
- Investigate templates or URLs that fail field thresholds.
- Verify whether the first image on image-led articles is the LCP element before
  making it eager or adding `fetchpriority="high"`.
- Give fingerprinted CSS, JavaScript, fonts, and processed images long immutable
  caching only after checking Cloudflare deployment behavior.
- Do not chase a perfect Lighthouse score for SEO.

### 4.4 Optional discovery improvements

- Consider IndexNow for faster notification of new or updated content after
  sitemap and internal-link fundamentals are stable.
- Treat IndexNow as a discovery aid, not a ranking mechanism.

### Phase 4 gate

- [ ] Search Console and Bing Webmaster Tools receive the correct sitemap.
- [ ] Sampled Google-selected canonicals match the intended URLs.
- [ ] Index coverage contains no unexplained systemic exclusions.
- [ ] Field Core Web Vitals are known and tracked.
- [ ] The next work queue is derived from actual query, page, and indexing data.

## Verification commands

Run the repository's required checks after relevant implementation slices:

```sh
hugo --gc --minify --destination /tmp/fradamroyal-seo-build
hugo --templateMetrics --templateMetricsHints --destination /tmp/fradamroyal-seo-metrics
node --test tests/content-model.test.js
node --test tests/bible-reading-plan.test.js tests/bible-reading-plan-exports.test.js tests/structured-data.test.js tests/canonical-links.test.js tests/navigation.test.js
git diff --check
```

Add focused generated-output tests as each phase introduces new invariants.

## Success measures

- Zero invalid or conflicting canonical annotations.
- Every indexable pagination page self-canonicalizes.
- Zero empty or non-index-worthy collection roots in the sitemap.
- Important content is reachable through useful navigation in about three
  clicks.
- New pages ship with distinctive titles, accurate descriptions, and validated
  metadata.
- Google-selected canonicals agree with declared canonicals on sampled URLs.
- Search Console shows stable or improving index coverage.
- Search-result CTR improves on pages whose title or description was changed,
  evaluated with sufficient data and seasonal context.
- Field Core Web Vitals are known and remain healthy.

## Explicit non-goals

Do not spend project time on:

- Keyword-density targets.
- Bulk AI rewriting or artificial word-count expansion.
- Buying backlinks or manufacturing mentions.
- Creating `llms.txt` for Google Search visibility.
- Creating AEO/GEO variants for every possible query.
- Adding schema fields solely because they exist.
- Fabricating reviews, ratings, credentials, or identity links.
- Generating decorative stock images merely to populate article schema.
- Migrating established underscore URLs merely to replace them with hyphens.
- Producing thin tag pages or one-page topic archives.
- Treating IndexNow, structured data, or perfect performance scores as ranking
  shortcuts.

## Primary guidance

- [Google canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google pagination guidance](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading)
- [Google title-link guidance](https://developers.google.com/search/docs/appearance/title-link)
- [Google snippet guidance](https://developers.google.com/search/docs/appearance/snippet)
- [Google link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
- [Google people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google structured-data guidance](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Google generative-search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Web Vitals guidance](https://web.dev/articles/vitals)

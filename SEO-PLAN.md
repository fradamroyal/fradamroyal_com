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

### NOW: Establish description conventions in Phase 2.2

Phases 1.3, 1.4, and 2.1 are implemented and verified locally. Deployment and
live smoke-testing for them remain pending. Continue with unique descriptions
for Home, About, Homilies, Reflections, Tools, and the Bible Reading Plan while
preserving the existing fallback for older content.

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

**Status:** Phase 2.1 is implemented and verified locally; deployment is
pending. Phase 2.2 is next.

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

- Declare the existing favicon explicitly in the document head.
- Add Open Graph and Twitter Card metadata using the centralized title,
  description, canonical, and image resolvers.
- Add explicit `images` metadata to image-bearing content.
- Use genuine representative images rather than decorative stock imagery.
- Validate deployed structured data with Google Rich Results Test and the
  Schema.org validator.

### Phase 2 gate

- [ ] Home and every main section have distinct titles and descriptions.
- [x] Recurring homilies have distinguishable document titles.
- [ ] About provides real author and editorial context.
- [ ] Articles contain a visible linked byline.
- [ ] Favicon and social-preview metadata render correctly.
- [ ] Structured data is valid and matches visible content.

## Phase 3 — Build durable editorial metadata and content hubs

**Outcome:** New and important content carries enough accurate metadata to
support useful discovery by feast, season, year, and Scripture without creating
thin pages.

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

Consider only fields that support a real reader task:

- Liturgical year or cycle.
- Liturgical season.
- Feast or occasion.
- Scripture books or passages.
- A small number of durable theological or pastoral themes.

Create a hub only when it has sufficient content and a useful introduction.
Avoid uncontrolled tag growth and one-item taxonomy pages.

### 3.3 Improve priority content presentation

- Add useful section introductions to Homilies and Reflections.
- Replace placeholder text in the root source file.
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

Add automated checks or warnings for:

- Required title, date, draft status, and description on new content.
- Duplicate SEO titles.
- Heading hierarchy.
- Broken internal links.
- Missing or empty image alt text.
- Missing image metadata on image-led articles.
- SBL Scripture abbreviation and reading-data validation.
- Date/time consistency where precise publication times matter.

### Phase 3 gate

- [ ] New content follows the metadata convention automatically.
- [ ] Priority and recent homilies have verified readings and descriptions.
- [ ] Every generated hub serves a clear reader purpose and has sufficient
      content.
- [ ] Heading, link, image, and Scripture lint checks pass.
- [ ] No metadata leaks into summaries or RSS against repository policy.

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

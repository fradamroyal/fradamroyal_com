# Controlled Content Metadata

This contract defines the small set of authored metadata that may support
future discovery across homilies and reflections. The machine-readable source
of truth is [`data/content_model.json`](data/content_model.json). Adding a value
to that registry does not create a page or make the value indexable.

## Authored fields

| Field | Homilies | Reflections | Use |
| --- | --- | --- | --- |
| `liturgical_season` | Required before publication | Optional | The primary liturgical context of the piece: `advent`, `christmas`, `lent`, `paschal-triduum`, `easter`, or `ordinary-time`. Do not infer it from the publication date when a reflection anticipates or looks back on a season. |
| `liturgical_occasion` | Required before publication | Optional | The registered liturgical day that the piece addresses: a Sunday, weekday, solemnity, feast, memorial, or other observance. Use one canonical lowercase kebab-case identifier, not a title or a free-form tag. |

The homily and reflection archetypes expose these fields. Blank values are
useful prompts while a page is a draft; remove unused optional fields before
publication rather than treating an empty string as metadata.

Occasion identifiers normalize editorial variations to one stable concept.
For example, use `fifteenth-sunday-in-ordinary-time` for both older “Per
Annum” titles and the current display wording. Normalize spelling and rank
variations similarly. Vigil, night, and day Mass forms normally use the parent
occasion while retaining the precise form in `title` and `[[readings]]`;
keep the Easter Vigil distinct as `easter-vigil`.

Use the underlying liturgy when a visible title emphasizes a pastoral program
or local theme. Classify fixed celebrations in the season in which their dated
liturgy occurs; the season field records liturgical context, not rank. Confirm
ambiguous cases from the date and `[[readings]]` rather than title wording
alone.

Add a new occasion only when a page needs it and no registered value expresses
the same liturgy. Keep identifiers stable and add an accurate human label to
the registry. The current published corpus uses 81 occasions across 138
homilies; every addition must remain deliberate and backed by a real content
record, including a draft in progress. Registry membership never generates a
hub automatically.

## Values derived from existing sources

- Use `date` for the civil publication year and the existing year archives. Do
  not duplicate it in a liturgical-year field.
- Do not add one scalar lectionary-cycle field. Sunday cycles A/B/C, weekday
  cycles I/II, fixed propers, and pages carrying multiple authorized reading
  sets do not share one unambiguous value.
- Keep `[[readings]]` as the only source for Scripture passages. Derive books
  and passage groupings from its SBL citations instead of adding parallel
  `scripture_books` or `scripture_passages` fields.
- Defer themes until an editorial vocabulary and reader-demand evidence exist.
  A speculative theme list would be another uncontrolled taxonomy.
- Do not use `categories`, `tags`, or `series`. Their Hugo output kinds remain
  disabled.

## Hub eligibility

A registered or derived value is only a candidate for a hub. A hub is never
generated automatically and must also have a unique human-written title,
description, useful introduction, section navigation, and generated-output
coverage.

| Hub dimension | Minimum evidence |
| --- | --- |
| Liturgical season | Six published articles across at least two years |
| Liturgical occasion | Three published articles across three distinct years |
| Scripture book | Twelve published articles across three years, derived from non-responsorial readings |
| Exact Scripture passage | Four published articles across three years, using the exact normalized non-responsorial citation |

These are eligibility floors, not a command to publish. An editor must still
confirm that the collection serves a reader need not already met better by a
year archive or the exact-Scripture related-homily links. Keep Hugo taxonomy and
term output disabled; hub layouts, navigation, and sitemap entries belong to a
later implementation slice after a demonstrated reader need and explicit
editorial selection.

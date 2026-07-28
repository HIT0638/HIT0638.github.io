# Article table of contents design

Date: 2026-07-28
Status: approved for implementation planning
Scope: article-page navigation only

## Context

The Lero β site is a Markdown-first, static article site. Article pages currently
render a single readable column with generous horizontal whitespace. The current
Markdown renderer is an existing unified pipeline in app/markdown.ts with
remark-GFM, remark-math, rehype-KaTeX, Mermaid enhancement, and static output for
GitHub Pages.

The user wants to use the empty left margin for a table of contents (TOC), while
keeping the article itself text-led and readable. The TOC must not mechanically
turn every visual heading into a large, permanently expanded outline.

## Goals

- Add a desktop left-side TOC to article pages.
- Keep the article reading column at a comfortable width; use the extra width for
  navigation rather than widening the text measure.
- Exclude the page H1 from the TOC.
- Include H2, H3, and H4 by default, mapped to TOC levels 1, 2, and 3.
- Allow an individual article to opt down to depth 2 or disable its TOC.
- Keep Markdown as the only canonical article source; do not write a generated
  TOC back into the Markdown file.
- Provide compact accordion behavior for long articles.
- Preserve stable anchor links and work with Chinese headings, formulas, emoji,
  Mermaid blocks, and duplicate heading text.
- Keep production output static and preserve the existing GitHub Pages workflow.

## Non-goals

- No TOC on the home/archive page.
- No automatic restructuring of article headings.
- No requirement for manual TOC markup in every article.
- No inclusion of H1, decorative labels, code-fence text, or Mermaid node labels.
- No database, runtime API, or server-side state.
- No redesign of the article typography beyond the layout space needed for the
  sidebar.

## Authoring contract

The default is depth 3. Existing required front matter remains unchanged:
title, date, summary, and draft.

Optional scalar front matter:

- tocDepth: 2 — include H2 and H3 only.
- tocDepth: 3 — include H2, H3, and H4; this is the default.
- toc: false — disable the TOC for an article that does not benefit from one.

H1 is always excluded, regardless of front matter. An author should use H2-H4
for semantic article structure. A visual label that should not be navigable
should be written as a non-heading paragraph or other existing Markdown
structure, rather than being promoted to H2/H3 merely for appearance.

No per-heading ignore syntax is required for the first version. If real articles
later demonstrate a need for exceptions, add that as a separate design instead
of inventing an ad hoc convention now.

## TOC hierarchy and interaction

Heading mapping:

- article H1: page title only; never in the TOC;
- H2: TOC level 1;
- H3: TOC level 2;
- H4: TOC level 3 when tocDepth is 3.

Accordion behavior:

- At most one H2 group is open at a time.
- The first H2 group is open when the page first loads, if one exists.
- Within the open H2 group, multiple H3 groups may be open independently.
- H4 links are shown only when their parent H3 group is open.
- Selecting a different H2 closes the previous H2 group and opens the selected
  group.
- Selecting a heading scrolls to its stable anchor and updates the URL fragment.
- A scroll observer highlights the current heading and opens its containing H2.
  It should not aggressively open every H3 while the reader scrolls; H3/H4
  expansion remains primarily user-controlled.
- Use aria-expanded, aria-controls, nav semantics, and aria-current for the
  active link. Respect prefers-reduced-motion.

Long TOCs:

- The left sidebar is sticky on large screens.
- Its contents have a maximum viewport-relative height and internal scrolling,
  so a long outline does not make the page layout taller than the viewport.
- The active item remains visible in the sidebar when practical.

Responsive behavior:

- On wide desktop layouts, use a grid: TOC column, gap, article column.
- Keep the article column near its existing readable maximum rather than
  stretching it to fill the new shell.
- Below the desktop breakpoint, remove the persistent side column and expose
  the TOC as a compact collapsible block above the article. This avoids
  squeezing the article on phones and narrow windows.
- The responsive collapse must preserve the same hierarchy and anchor links.

## Proposed architecture

### 1. Extract a structured outline

Create a small article-outline utility next to the existing article parsing code.
It should parse the article body with the same Markdown AST family already used by
the renderer and return:

- heading depth;
- visible heading text;
- stable id;
- parent/child relationships;
- whether the item has children;
- the effective tocDepth.

The extractor must ignore headings inside fenced code blocks naturally through the
Markdown AST. It must not infer headings from raw text or Mermaid node labels.

The existing simple front matter parser can continue to read scalar tocDepth and
toc values. A richer YAML parser is not needed for this feature.

### 2. Use one slug/id source

The rendered H2-H4 elements and TOC links must use the same deterministic ID
algorithm. Duplicate visible headings receive unique suffixes such as -2 and
-3. IDs must remain stable when unrelated paragraphs change.

The implementation may use a focused rehype heading-id plugin or a small local
plugin. A generic TOC plugin should not be allowed to choose a different
hierarchy or inject markup into the article body.

### 3. Render a dedicated ArticleToc component

Article pages should render a semantic nav beside the article. The component
receives the structured outline and owns:

- H2/H3/H4 tree rendering;
- accordion state;
- active-heading state;
- anchor links;
- desktop sticky styling and mobile collapse;
- accessibility attributes.

The article HTML remains rendered by the existing Markdown pipeline. Mermaid
enhancement and KaTeX rendering remain independent of the TOC component.

### 4. Keep source and generated output separate

The TOC is generated at article-load/build time from Markdown and rendered as
page UI. It is not added to the Markdown source, not counted as article body
content, and not included in the article's canonical title hierarchy.

## Tool choice

Use the existing unified/remark/rehype pipeline plus a small local outline
utility and React component.

Do not use remark-toc for the sidebar: it is designed to generate a TOC inside
the Markdown document, with max-depth and skip options, which conflicts with the
requirement that the side navigation remain generated UI and support accordions.

A heading-id plugin such as rehype-slug may be used for stable heading anchors,
provided the outline extractor and renderer share the same slugging behavior.
A third-party rehype TOC plugin is optional but not preferred because its default
tree and markup are less aligned with the project's custom accordion and
scroll-spy behavior.

Reference documentation:

- https://unifiedjs.com/explore/package/remark-toc/
- https://unifiedjs.com/explore/project/rehypejs/rehype-slug

## Error and edge-case behavior

- An article with no H2-H4 headings has no TOC and keeps the current article
  layout.
- An article with H2 headings but no children still shows a flat H2 list.
- An article with only H3/H4 headings should not invent a missing H2 parent; the
  implementation should either render a flat outline or use the nearest valid
  structural parent without changing the article HTML. Prefer the simplest
  visible flat list and add a validation note if this pattern occurs.
- Duplicate headings get unique IDs and distinct links.
- Empty or malformed heading text falls back to a deterministic non-empty ID.
- Existing body-H1 suppression remains unchanged.
- A Markdown or Mermaid rendering error must not break the rest of the TOC;
  headings that still exist in the rendered body remain navigable.
- If JavaScript is unavailable, the article remains readable. The TOC may
  degrade to a normal nested list of anchor links.

## Validation plan

Add focused tests or a deterministic fixture covering:

1. H1 is absent from the TOC.
2. Default depth 3 includes H2, H3, and H4.
3. tocDepth 2 excludes H4.
4. toc: false omits the TOC.
5. Duplicate headings produce unique ids and working links.
6. Headings inside code fences are ignored.
7. Chinese, formula-containing, and emoji headings produce usable anchors.
8. One H2 accordion is open at a time; H3 groups within it can be opened
   independently.
9. Scroll state expands the current H2 without opening every nested group.
10. Desktop sticky layout and narrow-screen collapsible layout do not change
    article body width unexpectedly.
11. npm run build succeeds and the generated static article route contains the
    expected heading ids and TOC links.
12. Existing KaTeX and Mermaid rendering remains unchanged.

## Acceptance criteria

The feature is ready when:

- a normal article shows a compact left TOC with H2/H3/H4 at default depth 3;
- H1 is never displayed in the TOC;
- the first H2 is open initially;
- only one H2 is open at once;
- multiple H3 sections can be open under the active H2;
- H4 appears only under an expanded H3;
- long TOCs scroll inside the sidebar;
- mobile layouts remain readable;
- article source files do not gain generated TOC markup;
- draft filtering, article URLs, KaTeX, Mermaid, and GitHub Pages output retain
  their existing behavior.

## Implementation boundary

This document is a design approval, not an implementation plan. Before coding,
create an implementation plan that lists the exact files and tests. Do not edit
article content or the current uncommitted user files while implementing the
feature.

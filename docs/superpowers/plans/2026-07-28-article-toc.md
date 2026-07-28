# Article Table of Contents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax (- [ ]) for tracking.

**Goal:** Add a compact, left-side, hierarchical table of contents to article pages while keeping Markdown canonical, H1 excluded, and H2-H4 available by default.

**Architecture:** Parse article front matter and Markdown headings into a structured outline. During the existing unified render, assign the same stable IDs to rendered H2-H4 headings and return the outline alongside HTML. Render the outline with a dedicated client-side ArticleToc component that owns accordion state, scroll tracking, anchor links, and responsive collapse behavior.

**Tech Stack:** Existing vinext/React/TypeScript app; unified, remark-parse, remark-gfm, remark-math, remark-rehype, rehype-katex, rehype-stringify; browser IntersectionObserver; Node test runner with built-in TypeScript stripping.

## Global Constraints

- Markdown remains the only canonical article source; never write generated TOC markup into article files.
- H1 is always excluded from the TOC.
- Default tocDepth is 3, mapping H2/H3/H4 to TOC levels 1/2/3.
- tocDepth: 2 includes H2/H3 only; toc: false disables the TOC.
- Keep the article text column near its existing readable maximum; use new width for the left sidebar.
- At most one H2 accordion is open; multiple H3 groups may be open under it.
- H4 links appear only under an expanded H3 group.
- The first H2 opens initially when an article has at least one H2.
- Do not edit or stage the user's uncommitted article changes, drafts, slide spec, or other untracked files.
- Do not add a runtime database, external API, or new UI module outside the article page.
- Keep KaTeX, Mermaid, draft filtering, article URLs, and static GitHub Pages output working.
- Start implementation from latest stable main in a focused branch and preserve any user changes from fix/draft-visibility.

## File Map

Create:

- app/article-outline.ts — TOC configuration, Markdown heading traversal, stable IDs, and outline types.
- app/article-toc.tsx — client-side semantic navigation with accordion and scroll state.
- tests/article-toc.test.ts — outline, front matter, ID, and rendered-heading tests.

Modify:

- app/articles.ts — parse optional tocDepth/toc front matter and expose config on Article.
- app/markdown.ts — annotate H2-H4 with stable IDs and return HTML plus structured TOC.
- app/articles/[slug]/page.tsx — render ArticleToc beside the article.
- app/globals.css — grid, sticky sidebar, accordion styles, active links, mobile collapse.
- content/notes/README.md — document TOC controls and semantic heading guidance.
- AGENTS.md — keep agent authoring rules synchronized.
- package.json — add a focused article TOC test script without changing versions.

---
## Task 1: Define the outline model and front matter contract

Files:
- Create app/article-outline.ts
- Create tests/article-toc.test.ts
- Modify app/articles.ts
- Modify package.json

Interfaces:

~~~ts
export type TocDepth = 2 | 3;

export type ArticleTocConfig = {
  enabled: boolean;
  depth: TocDepth;
};

export type ArticleTocItem = {
  id: string;
  text: string;
  headingDepth: 2 | 3 | 4;
  level: 1 | 2 | 3;
  children: ArticleTocItem[];
};

export type MarkdownRoot = {
  type: string;
  depth?: number;
  value?: string;
  children?: MarkdownRoot[];
  data?: { hProperties?: Record<string, string> };
};

export function parseArticleTocConfig(
  frontMatter: Record<string, string>,
): ArticleTocConfig;

export function annotateArticleHeadings(
  root: MarkdownRoot,
  config: ArticleTocConfig,
): ArticleTocItem[];
~~~

Use a small local MarkdownRoot structural type instead of a new runtime
dependency. Nodes need type, optional depth/value/children, and optional
data.hProperties.id.

Implement:

- Default config: enabled true, depth 3.
- Only an exact case-insensitive front matter value of false disables toc.
- tocDepth value 2 selects depth 2; every other value falls back to 3.
- Never collect H1.
- Give H2-H4 stable IDs; include only headings within the configured depth.
- Collect visible text recursively from phrasing children.
- Ignore headings inside fenced code because traversal uses the Markdown AST.
- Normalize IDs using useful Unicode letters/numbers, hyphens for whitespace,
  punctuation removal, section fallback, and -2/-3 duplicate suffixes.
- Nest under the nearest preceding smaller heading. If the document starts with
  H3/H4 and has no H2 parent, keep those items at the root.

Test fixtures should use the same remark AST shape as the renderer. Add this
helper at the top of the test file:

~~~ts
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { MarkdownRoot } from "../app/article-outline.ts";

const parseMarkdown = (source: string): MarkdownRoot =>
  unified().use(remarkParse).parse(source) as MarkdownRoot;
~~~

Steps:

- [ ] Add failing tests for default depth 3, H1 exclusion, tocDepth 2, toc false,
  duplicate headings, Chinese/formula/emoji headings, and fenced-code headings.
- [ ] Run npm run test:article-toc; expect failure because the utility is absent.
- [ ] Implement the types, front matter parser, AST traversal, and ID allocator.
- [ ] Add this package script without changing existing scripts:

~~~json
"test:article-toc": "node --experimental-strip-types --test tests/article-toc.test.ts"
~~~

- [ ] Run npm run test:article-toc and expect all outline tests to pass.
- [ ] Review git diff --check and git diff --cached.
- [ ] Commit with:

~~~bash
git add -- app/article-outline.ts tests/article-toc.test.ts app/articles.ts package.json
git commit -m "feat: define article toc outline"
~~~

---
## Task 2: Integrate outline IDs with the Markdown renderer

Files:
- Modify app/markdown.ts
- Modify tests/article-toc.test.ts

Change renderMarkdown to return:

~~~ts
export type RenderedMarkdown = {
  html: string;
  toc: ArticleTocItem[];
};

export async function renderMarkdown(
  source: string,
  tocConfig: ArticleTocConfig,
): Promise<RenderedMarkdown>;
~~~

The function must parse normalized Markdown, call annotateArticleHeadings before
remark-rehype converts it to HTML, run the existing GFM/math/KaTeX/stringify
pipeline, and return HTML plus outline. Keep math delimiter normalization and
Mermaid compatibility unchanged.

Steps:

- [ ] Add a failing fixture with H1-H4 and duplicate headings. Assert that H2-H4
  HTML elements have matching IDs, the outline has matching IDs, and duplicate
  headings receive unique suffixes.
- [ ] Assert that a disabled TOC still returns readable HTML with an empty TOC,
  and that KaTeX and Mermaid source still render.
- [ ] Run npm run test:article-toc; expect failure because renderMarkdown still
  returns only a string.
- [ ] Change renderMarkdown to parse, annotate, run, and stringify. Do not add
  remark-toc or write TOC markup into source.
- [ ] Update the article page caller in Task 3 to consume rendered.html.
- [ ] Run:

~~~bash
npm run test:article-toc
npm run lint
~~~

- [ ] Review and commit:

~~~bash
git add -- app/markdown.ts tests/article-toc.test.ts
git commit -m "feat: expose article toc from markdown rendering"
~~~

---
## Task 3: Build the left-side ArticleToc component

Files:
- Create app/article-toc.tsx
- Modify app/articles/[slug]/page.tsx
- Modify app/globals.css

Interface:

~~~ts
type ArticleTocProps = {
  items: ArticleTocItem[];
};
~~~

The client component renders a semantic nav with an H2-level list, links for all
items, toggle buttons only for items with children, aria-expanded,
aria-controls, aria-current="location", and an accessible label such as
文章目录. On mobile it exposes a compact collapsible summary.

State rules:

- Initialize active/open H2 to the first root item.
- Store one open root H2 ID.
- Store a Set of open H3 IDs.
- H2 clicks switch the root and close the previous root.
- H3 clicks toggle only that H3.
- Anchor clicks update the URL fragment and scroll, respecting reduced motion.
- IntersectionObserver watches rendered H2-H4 IDs, highlights the current item,
  and opens its containing H2 without expanding every H3.
- Render null when items is empty.

Update the article page to call renderMarkdown with article.toc, use
rendered.html, render ArticleToc only for an enabled non-empty TOC, and preserve
metadata, back link, MermaidRenderer, and H1 suppression.

Initial CSS shape:

~~~css
.article-page-layout {
  display: grid;
  grid-template-columns: minmax(150px, 190px) minmax(0, 820px);
  gap: 42px;
  align-items: start;
}

.article-toc {
  position: sticky;
  top: 32px;
  max-height: calc(100vh - 64px);
  overflow-y: auto;
}

@media (max-width: 1050px) {
  .article-page-layout {
    display: block;
  }

  .article-toc {
    position: static;
    max-height: none;
  }
}
~~~

Keep the current warm-white/black/orange language and article max-width near
820px. At the narrow breakpoint, place the collapsible TOC above the article.

Steps:

- [ ] Add the component shell and static tree rendering.
- [ ] Implement root/H3 accordion state with functional state updates.
- [ ] Add IntersectionObserver with cleanup and missing-ID tolerance.
- [ ] Integrate the page and CSS grid without changing article typography.
- [ ] Run npm run lint and npm run build; expect both to pass.
- [ ] Run npm run dev and verify H1 exclusion, first H2 open, one H2 at a time,
  multiple H3 groups, conditional H4, anchor scrolling, active highlighting,
  internal sidebar scrolling, mobile collapse, KaTeX, and Mermaid.
- [ ] Review and commit:

~~~bash
git add -- app/article-toc.tsx app/articles/[slug]/page.tsx app/globals.css
git commit -m "feat: add collapsible article toc"
~~~

---
## Task 4: Document authoring controls and run end-to-end validation

Files:
- Modify content/notes/README.md
- Modify AGENTS.md
- Modify tests/article-toc.test.ts only for any final edge case
- Modify package.json only if the focused test script needs adjustment

Document H1 exclusion, default depth 3, tocDepth 2 as compact mode,
tocDepth 3 as default, toc false as disabled, and the rule that decorative text
should not be promoted to a semantic heading solely for styling.

Steps:

- [ ] Add this authoring example:

~~~yaml
---
title: A long article
date: 2026-07-28
summary: A one-sentence archive summary.
draft: false
tocDepth: 2
---
~~~

- [ ] Add final tests for no headings, flat H2-only articles, H3/H4 without H2,
  duplicate IDs, formula/emoji/Chinese heading text, and headings inside code
  fences. Assert that source Markdown is unchanged.
- [ ] Run:

~~~bash
npm run test:article-toc
npm run lint
npm run build
git diff --check
~~~

- [ ] Inspect generated article HTML for matching heading IDs and TOC hrefs.
- [ ] Review git status, git diff --stat, and git diff --check. Confirm only the
  TOC implementation, tests, and authoring docs changed. Do not stage the user's
  drafts or untracked notes.
- [ ] Commit:

~~~bash
git add -- content/notes/README.md AGENTS.md tests/article-toc.test.ts
git commit -m "docs: document article toc controls"
~~~

- [ ] Publish only after explicit user approval of the visual result. Merging to
  main triggers .github/workflows/deploy-pages.yml.

## Execution notes

The current active worktree contains unrelated uncommitted article and draft
changes. Implementation must use a separate focused worktree or branch and must
not clean, stash, reset, or delete those files. If app/articles.ts has changed
for dev-only draft visibility, preserve that behavior while adding TOC config.

Relevant troubleshooting records:

- docs/troubleshooting/2026-07-28-markdown-content-hmr.md
- docs/troubleshooting/2026-07-28-mermaid-diagram-size.md
- docs/troubleshooting/2026-07-28-github-pages-lockfile.md

# Lero β personal site

## Project intent

This is a pseudonymous, notes-first personal website for **Lero β**. The
current page is an initial visual prototype, not the final information
architecture. The near-term priority is a simple, text-led notes experience;
projects and other sections should only appear when there is real content to
support them.

## Content and data policy

- Published notes are Markdown files under `content/notes/`.
- Each note should use a stable filename such as
  `YYYY-MM-DD-short-slug.md` and YAML front matter:

  ```yaml
  ---
  title: A note title
  date: 2026-07-27
  summary: One sentence that helps the archive scan well.
  draft: false
  # Optional: tocDepth: 2 for H2/H3 only; toc: false to hide the TOC.
  ---
  ```

- Do not add tags by default. The current archive has no tag interface, and the
  writing style should stay text-led rather than becoming tag-led.
- Markdown is the source of truth. The site build turns it into static pages
  for GitHub Pages, so notes remain portable, searchable in Git, and easy to
  edit without an online database.
- Do not introduce SQLite for the published site at this stage. SQLite would
  require a server or a separate build pipeline and would add operational
  complexity without helping a small, mostly static notes archive.
- Reconsider a database only if the project later needs runtime writes,
  accounts, comments, private drafts, or another feature that cannot be
  represented as versioned files. If that happens, keep Markdown as the
  canonical archive where practical and add a database deliberately.

## Article authoring and agent editing contract

### Default article structure

- Use one stable Markdown file per article with an ISO date in its filename:
  `YYYY-MM-DD-short-slug.md`. Prefer lowercase English kebab-case slugs so
  article URLs stay short and predictable.
- Required front matter is `title`, `date`, `summary`, and `draft`. Use an ISO
  date (`YYYY-MM-DD`) and keep `summary` to one sentence.
- The front matter `title` is the canonical page title. A leading body H1 with
  the same text is allowed for editor readability; the site suppresses that
  duplicate when rendering. Do not add a second, different H1.
- Use H2 for major sections, H3 for topics inside them, and H4 only when a
  topic genuinely needs another level. Do not skip heading levels.
- Article pages exclude H1 from the TOC. By default, the TOC includes H2, H3,
  and H4 (`tocDepth: 3`), with H2 as the first level. Use `tocDepth: 2` for a
  compact H2/H3 TOC, or `toc: false` when an article should have no TOC.
- Treat headings as semantic structure, not decorative styling. Do not promote
  a sentence to H2/H3 solely to change its appearance; it will become a
  navigable TOC entry and receive an anchor ID.
- Keep paragraphs readable and use lists for enumerations. Preserve the
  author's uncertainty, terminology, numbers, variables, formulas, code, and
  diagram source unless a content change was explicitly requested.

### What an agent may change

- If the request is “格式整理”, the default scope is front matter, filename,
  heading hierarchy, whitespace, code-fence language labels, link syntax, and
  rendering compatibility. Do not rewrite the argument or scientific data.
- If the request is “润色”, improve wording and transitions while preserving
  claims and meaning. Do not silently correct a formula, result, citation, or
  interpretation; flag suspected problems for the author.
- If the request would substantially reorder sections or change the argument,
  first summarize the proposed outline and ask for confirmation. Small
  heading/paragraph cleanup does not need a separate approval.
- Never invent citations, experimental results, references, or missing values.
  Add sources only when the author provides them or explicitly asks for
  research and citation work.

### Math, diagrams, icons, and other Markdown

- The article renderer supports GitHub-Flavored Markdown and static KaTeX
  math. Prefer `$...$` for inline math and `$$...$$` for display math. Existing
  Obsidian-style `\(...\)` and `\[...\]` delimiters are also supported; keep
  those delimiters in the source instead of rewriting them automatically.
- Treat formulas as data. Check that delimiters and LaTeX syntax render, but do
  not change the mathematical expression's meaning without explicit approval.
  Math-like text inside fenced code blocks must remain code.
- Keep structural diagrams as Mermaid source in fenced `mermaid` blocks. Add
  `accTitle` and `accDescr`, use `snake_case` node IDs, concise labels, and no
  `%%{init}` or inline `style` directives. Article pages enhance valid Mermaid
  blocks into themed SVG diagrams in the browser; the Markdown source remains
  canonical, and a syntax error leaves the source block visible.
- Emoji are text accents, not an icon system. Use them sparingly—never in the
  H1, and at most one meaningful emoji at the start of an H2 or Mermaid node.
  Do not introduce an icon library or hand-written SVG for an article.
- Use fenced code blocks with a language identifier, such as a Python or text
  fence. Images should use Markdown syntax with descriptive alt text and live
  under the site's public asset path. Do not invent image-layout classes until
  the renderer defines them.

## Troubleshooting and maintenance records

- Keep confirmed, reusable implementation lessons and rendering, build, or
  workflow incidents under `docs/troubleshooting/`.
- Use one dated Markdown file per issue:
  `YYYY-MM-DD-short-slug.md`. Record the symptom, affected scope, root cause,
  final fix, validation, and any useful failed approach or follow-up.
- Add or update a record when an agent resolves a non-obvious bug,
  compatibility issue, or maintenance trap. Do not create records for trivial
  typos or transient tool failures with no reusable lesson.
- Keep Markdown, Mermaid, formulas, and other source files canonical. A static
  image may be used as a deliberate fallback, but the record must explain the
  tradeoff and preserve the source whenever practical.
- Mention the relevant troubleshooting record in the handoff when it changes
  future authoring or maintenance behavior.

## Git safety and branch policy

- `main` is the stable, reviewable branch and the only branch eligible for
  GitHub Pages deployment.
- Notes and writing may be committed directly to `main`. This keeps the
  normal publishing flow lightweight and lets Git provide the writing history.
  Keep these commits focused, and use `draft: true` for unfinished notes when
  the site renderer supports draft filtering.
- Never develop site code directly on `main`. Start code, design, tooling, and
  bug-fix work from the latest `main` using a focused branch:
  - `feat/<topic>` for a new capability;
  - `fix/<topic>` for a correction;
  - `design/<topic>` for visual work;
  - `chore/<topic>` for tooling or maintenance.
- Keep commits small and single-purpose. Prefer messages such as
  `content: add note on ...` or `design: simplify notes index`.
- Before editing, run `git status --short --branch` and confirm there are no
  unrelated changes. Before committing, review `git diff --check` and
  `git diff --cached`.
- Do not commit secrets, `.env*` files, `node_modules`, build output,
  Wrangler state, or local worktrees. Do not force-push `main` or rewrite its
  history.
- Before merging a site change, run `npm run build` and inspect the local
  preview. Content-only changes should still be checked for front matter and
  broken links.
- If parallel work genuinely needs filesystem isolation, use an ignored
  `.worktrees/` directory; otherwise a normal focused branch is sufficient.

## Current implementation notes

- Site code lives under `app/` and is currently based on the bundled vinext
  starter.
- Keep the GitHub Pages constraint in mind: the public output must remain
  static and must not depend on a runtime database.
- Do not add empty navigation items or speculative modules. Add a section only
  when there is content and a clear reading reason for it.

### Study collections

- The first migrated collections are `flink-interview` and `dw-interview`.
  Their canonical Markdown and code sources live under
  `content/collections/<slug>/docs/` and `content/collections/<slug>/code/`.
  Keep those source files unchanged when adapting the presentation; do not
  copy generated MkDocs `site/` output, caches, or local environment files.
- Collection metadata and the explicit module/reference navigation map live
  in `app/prototype/study-collections/data.ts`. When adding a source page,
  update that map and keep its route path stable.
- To add a new collection, first create its source tree under
  `content/collections/<slug>/`:
  `docs/index.md` is the overview, `docs/` contains module pages,
  `docs/reference/` contains optional reference pages, and `code/` contains
  linked code or snippet sources. Use a lowercase kebab-case `<slug>` and
  preserve the original Markdown/code as the source of truth.
- A new collection is not discovered from files alone. Add one entry to
  `app/prototype/study-collections/data.ts` with a unique `code` and `slug`,
  card metadata, and explicit `supportPages`, `modules`, and `references`
  paths. Every listed path must exist under the collection's `docs/` tree.
  The order of `modules` controls the card preview; the first three are shown
  on the shelf card.
- For a new collection or a multi-file content migration, use a temporary
  `feat/content-<topic>` branch based on the latest `main`. The same branch
  may contain the collection's source files under
  `content/collections/<slug>/` and the directly corresponding topic-page
  changes under `app/prototype/study-collections/`, including its registry
  entry in `data.ts`. Keep the branch scoped to this collection; do not mix
  unrelated site work into it.
- Keep the content and topic-page changes as separate focused commits when
  practical, for example `content: add <topic> sources` followed by
  `feat: connect <topic> collection`. Before merging, review
  `git diff --name-only main...HEAD` and confirm that only the collection
  content, its topic-page code, and any relevant troubleshooting record have
  changed. Ordinary single-note writing may still follow the lightweight
  `main` flow.
- After registration, run `npm run build` and inspect both
  `/prototype/study-collections?variant=shelf` and
  `/prototype/study-collections/<slug>`. Validate at least one module, one
  table/admonition or Mermaid block when present, one relative document link,
  and one code link or `--8<--` snippet when present.
- Collection pages support GFM tables/lists, KaTeX math, Mermaid code fences,
  MkDocs `???`/`!!!` admonitions, raw `<details>` blocks, and `--8<--` code
  snippets. Preserve the original Markdown/code as the source of truth; put
  compatibility logic in the renderer rather than rewriting migrated content.
- Relative links inside a collection must resolve to the collection's local
  reading or code route. Validate at least one module with a Mermaid diagram,
  one page with an admonition/table, and one linked code file after changes.
- If a migrated MkDocs feature renders incorrectly, record the symptom,
  cause, workaround, and validation under `docs/troubleshooting/` before
  changing the source material.

## Handoff checklist

1. Confirm the branch is not `main` for feature, design, fix, or tooling work.
   Content-only notes and writing may intentionally stay on `main`.
2. Read the relevant files and preserve unrelated user changes.
3. Make one focused change and review the diff.
4. Run the smallest relevant validation, including `npm run build` before a
   merge.
5. Merge to `main` only after the change is intentionally ready to publish.

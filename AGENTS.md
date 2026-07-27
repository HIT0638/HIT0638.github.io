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
  tags: [thinking, notes]
  draft: false
  ---
  ```

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

## Handoff checklist

1. Confirm the branch is not `main` for feature, design, fix, or tooling work.
   Content-only notes and writing may intentionally stay on `main`.
2. Read the relevant files and preserve unrelated user changes.
3. Make one focused change and review the diff.
4. Run the smallest relevant validation, including `npm run build` before a
   merge.
5. Merge to `main` only after the change is intentionally ready to publish.

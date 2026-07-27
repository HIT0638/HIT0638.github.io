# Notes

This directory is the source of truth for Lero β's public notes.

Create one Markdown file per note using a stable filename:

```text
YYYY-MM-DD-short-slug.md
```

Each note should begin with front matter like this:

```yaml
---
title: A note title
date: 2026-07-27
summary: One sentence for the notes index.
tags: [notes]
draft: false
---
```

The site will render these files into static pages. Keep drafts as
`draft: true` until they are ready to publish.

Article bodies use Markdown with GitHub-Flavored Markdown extensions. Math can
be written with LaTeX syntax: use `$...$` for inline math and `$$...$$` for a
displayed formula.

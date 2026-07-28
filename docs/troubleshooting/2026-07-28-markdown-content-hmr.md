# Markdown article HMR in vinext dev

## Symptom

Editing an existing Markdown article under `content/notes/` did not update the
preview. Restarting `npm run dev` made the new content appear.

## Reproduction

Touching the article file while the dev server was running triggered Vite's HMR
path and produced:

```text
Failed to parse source for import analysis because the content contains invalid JS syntax.
```

The file watcher itself was working; the failure happened after the Markdown
change reached the RSC/Vite update pipeline.

## Root cause

`app/articles.ts` loads notes through an eager `import.meta.glob` with `?raw`.
The initial server load handles those Markdown modules correctly, but the
vinext/RSC HMR path tried to transform the changed `.md` module as JavaScript.
The failed update left the cached article module unchanged, while a dev-server
restart rebuilt the module graph from the new file.

The polling setting in `vite.config.ts` was not the primary cause: the touch
probe confirmed that the Markdown file event was detected.

## Fix

`vite.config.ts` now registers a serve-only `markdown-content-full-reload`
plugin. For changes under `content/notes/*.md`, it filters the broken raw-module
HMR update and sends a client full reload. The Markdown source and the static
build path remain unchanged, and edits no longer require restarting dev.

## Validation

- A temporary front matter summary marker appeared in the article response after
  editing the Markdown file, without restarting the dev server.
- The temporary marker was restored immediately afterward.
- The post-fix touch probe produced no Markdown parse error in the dev log.
- `npm run lint -- --ignore-pattern .obsidian` passed.
- `git diff --check` passed.

## Scope

This is intentionally a full browser refresh for Markdown content, not a
component-level HMR update. It affects only notes under `content/notes/`; normal
React and CSS HMR behavior remains unchanged.

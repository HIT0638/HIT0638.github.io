# Mermaid flowcharts rendered too large

## Symptom

Three vertical flowcharts in the restructured Pairtree article were much larger
than the surrounding text. The affected diagrams were the `ω → φ` dependency
graph, the pairwise relation posterior graph, and the TreeMCMC proposal graph.

## Root cause

The shared Mermaid rule in `app/globals.css` applied `min-width: 560px` to every
rendered SVG and also disabled its maximum width. Narrow, top-to-bottom SVGs
were therefore enlarged to the minimum width, which also enlarged their height.

## What did not work

Shortening or merging Mermaid nodes changed the diagram's source without
reliably changing its rendered size. The source should remain faithful to the
article's explanation; layout scale belongs in the renderer layer.

## Fix

The three diagrams were restored to their original Mermaid source. The browser
renderer now recognizes their `accTitle` values and adds a compact class only
to those diagrams. The compact CSS removes the forced minimum width and caps
the diagram at about 620px; all other Mermaid diagrams keep the normal style.

## Validation

- Both article preview routes returned HTTP 200 from the local development
  server.
- `npm run lint -- --ignore-pattern .obsidian` passed.
- `git diff --check` passed.
- The Markdown source, formulas, accessibility descriptions, and other Mermaid
  diagrams were left unchanged.

## Reuse rule

When only one or a few Mermaid diagrams are too large, first target them by a
stable `accTitle` or another explicit renderer marker. Do not globally shrink
all diagrams, and do not rewrite diagram content to compensate for a CSS sizing
problem.

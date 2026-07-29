# Article tables need explicit styling

## Symptom

Pipe tables in published articles were parsed but looked like unstructured
text. The rows and columns were difficult to distinguish in the article page.

## Affected scope

Article pages rendered from Markdown under `content/notes/`, especially tables
with formulas or long Chinese descriptions.

## Root cause

`remark-gfm` was already converting pipe-table Markdown into semantic
`<table>`, `<thead>`, `<tbody>`, `<th>`, and `<td>` elements. The article CSS
had no table-specific rules, so the browser's borderless defaults made the
structure visually unclear.

## Final fix

`app/globals.css` now gives article tables a full reading width, collapsed
borders, cell padding, visible cell boundaries, a subtle header background, and
safe wrapping for long cell content. A focused regression check keeps these
table styles present.

## Validation

- `npm run test:article-toc` — 10 tests passed.
- Local preview confirmed the rendered table has visible rows and columns.
- `npm run lint` and `npm run build` should be run before merging the change.

## Authoring note

Continue using ordinary GFM pipe-table syntax in Markdown. Do not add HTML
table markup or layout classes to individual articles just to make a table
visible.

# Study collections prototype

Question: should the existing Flink and data-warehouse MkDocs material become
ordinary articles, or a separate collection/series layer?

This throwaway route compares three views at
`/prototype/study-collections?variant=catalog|workspace|shelf`:

- `catalog`: a text-first list close to the current Lero β archive;
- `workspace`: a collection switcher with a current course outline;
- `shelf`: a responsive collection-card grid that links to a dedicated
  MkDocs-like reading page.

Current direction: use the card view as the collection entry point. The grid
can expand from large cards when there are only a few collections to multiple
cards per row as the number grows. Each card previews exactly three modules;
the complete module navigation appears after entering the collection page.

Visual verdict: cards do not need to match the page background. Different card
colors are acceptable when they remain coherent with the Lero β palette and do
not make the collection area feel disconnected from the rest of the site.

The two first collections are now connected to their original Markdown and
code sources under `content/collections/`. The dedicated route keeps a
collection-specific sidebar/navigation and reading surface without turning
every module into a top-level article. MkDocs admonitions are adapted to
native `details`/`aside` blocks, snippet directives are expanded from the
copied `code/` tree, and relative Markdown/code links stay inside the
collection routes.

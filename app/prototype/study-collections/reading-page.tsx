import Link from "next/link";
import MermaidRenderer from "../../mermaid-renderer";
import { renderCollectionDocument, type CollectionCodeFile, type CollectionDocument } from "./content";
import type { Collection, Module } from "./data";

type CollectionReadingPageProps = {
  collection: Collection;
  document: CollectionDocument;
  currentPath: string;
  pageKind: "overview" | "support" | "module" | "reference";
};

function documentHref(slug: string, path: string) {
  if (path.startsWith("reference/")) {
    return `/prototype/study-collections/${slug}/reference/${path
      .slice("reference/".length)
      .replace(/\.md$/, "")}`;
  }

  return `/prototype/study-collections/${slug}/${path.replace(/\.md$/, "")}`;
}

function removeRenderedTitle(source: string, title: string) {
  const headingMatch = source.match(/^#\s+([^\r\n]+)\r?\n+/);

  if (headingMatch?.[1].trim() === title.trim()) {
    return source.slice(headingMatch[0].length);
  }

  return source;
}

function isActivePath(currentPath: string, path: string) {
  return currentPath === path ? " is-active" : "";
}

function CollectionNav({
  collection,
  currentPath,
}: {
  collection: Collection;
  currentPath: string;
}) {
  const basePath = `/prototype/study-collections/${collection.slug}`;

  function renderPageLink(page: Module) {
    return (
      <Link
        className={isActivePath(currentPath, page.path)}
        href={documentHref(collection.slug, page.path)}
        key={page.path}
      >
        <span>{page.code}</span>
        <strong>{page.title}</strong>
      </Link>
    );
  }

  return (
    <aside
      className="study-prototype-doc-nav"
      aria-label={`${collection.title}专题导航`}
    >
      <p className="study-prototype-label">COLLECTION / {collection.code}</p>
      <p className="study-prototype-doc-nav-subtitle">{collection.subtitle}</p>
      <nav>
        <Link className={isActivePath(currentPath, "index.md")} href={basePath}>
          <span>HOME</span>
          <strong>课程说明</strong>
        </Link>

        {collection.supportPages.length > 0 ? (
          <>
            <p className="study-prototype-doc-nav-group">BACKGROUND</p>
            {collection.supportPages.map(renderPageLink)}
          </>
        ) : null}

        <p className="study-prototype-doc-nav-group">MODULES</p>
        {collection.modules.map(renderPageLink)}

        {collection.references.length > 0 ? (
          <>
            <p className="study-prototype-doc-nav-group">REFERENCE</p>
            {collection.references.map(renderPageLink)}
          </>
        ) : null}
      </nav>
    </aside>
  );
}

export async function CollectionReadingPage({
  collection,
  document,
  currentPath,
  pageKind,
}: CollectionReadingPageProps) {
  const rendered = await renderCollectionDocument({
    ...document,
    source: removeRenderedTitle(document.source, document.title),
  });
  const pageLabel =
    pageKind === "overview"
      ? "COURSE OVERVIEW"
      : `${pageKind.toUpperCase()} / ${collection.code}`;

  return (
    <main className="site-shell study-prototype-shell study-prototype-doc-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="返回首页">
          <span className="brand-mark brand-mark-beta">
            L<span className="brand-beta">β</span>
          </span>
          <span className="brand-name">Lero β</span>
        </Link>
        <Link
          className="header-context study-prototype-doc-back"
          href="/prototype/study-collections"
        >
          ← 专题卡片
        </Link>
      </header>

      <div className="study-prototype-doc-layout">
        <CollectionNav collection={collection} currentPath={currentPath} />

        <section className="study-prototype-doc-content">
          <header className="study-prototype-doc-heading">
            <p className="study-prototype-label">{pageLabel}</p>
            <h2>{document.title}</h2>
            {pageKind === "overview" ? (
              <p className="study-prototype-doc-summary">{collection.summary}</p>
            ) : null}
          </header>

          <div className="study-prototype-doc-rule" />

          <article
            className="article-body study-prototype-collection-body"
            dangerouslySetInnerHTML={{ __html: rendered.html }}
          />
          <MermaidRenderer />
        </section>
      </div>

      <footer className="site-footer study-prototype-footer">
        <span>COLLECTION · Markdown source connected</span>
        <Link href="/prototype/study-collections">← back to collections</Link>
      </footer>
    </main>
  );
}

export async function CollectionCodePage({
  collection,
  codeFile,
}: {
  collection: Collection;
  codeFile: CollectionCodeFile;
}) {
  return (
    <main className="site-shell study-prototype-shell study-prototype-doc-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="返回首页">
          <span className="brand-mark brand-mark-beta">
            L<span className="brand-beta">β</span>
          </span>
          <span className="brand-name">Lero β</span>
        </Link>
        <Link
          className="header-context study-prototype-doc-back"
          href={`/prototype/study-collections/${collection.slug}`}
        >
          ← 返回专题
        </Link>
      </header>

      <div className="study-prototype-doc-layout">
        <aside className="study-prototype-doc-nav">
          <p className="study-prototype-label">COLLECTION / {collection.code}</p>
          <h1>{collection.title}</h1>
          <p className="study-prototype-doc-nav-subtitle">{collection.subtitle}</p>
          <Link href={`/prototype/study-collections/${collection.slug}`}>
            ← 返回课程说明
          </Link>
        </aside>
        <section className="study-prototype-doc-content">
          <header className="study-prototype-doc-heading">
            <p className="study-prototype-label">CODE / {collection.code}</p>
            <h2>{codeFile.title}</h2>
            <p className="study-prototype-doc-summary">{codeFile.path}</p>
          </header>
          <div className="study-prototype-doc-rule" />
          <pre className="study-prototype-code-view">{codeFile.source}</pre>
        </section>
      </div>

      <footer className="site-footer study-prototype-footer">
        <span>COLLECTION · source file</span>
        <Link href={`/prototype/study-collections/${collection.slug}`}>
          ← back to collection
        </Link>
      </footer>
    </main>
  );
}

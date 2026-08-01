"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import type { ArticleTocItem } from "./article-outline.ts";

type ArticleSplitTocProps = {
  items: ArticleTocItem[];
};

function flattenItems(items: ArticleTocItem[]): ArticleTocItem[] {
  return items.flatMap((item) => [item, ...flattenItems(item.children)]);
}

function buildHeadingMaps(items: ArticleTocItem[]) {
  const headingToRoot = new Map<string, string>();
  const headingToChild = new Map<string, string | null>();

  function visit(
    item: ArticleTocItem,
    rootId: string,
    childId: string | null,
  ) {
    const nextRootId = item.headingDepth === 2 ? item.id : rootId;
    const nextChildId = item.headingDepth === 3 ? item.id : childId;

    headingToRoot.set(item.id, nextRootId);
    headingToChild.set(item.id, nextChildId);

    for (const child of item.children) {
      visit(child, nextRootId, nextChildId);
    }
  }

  for (const item of items) {
    visit(item, item.id, null);
  }

  return { headingToRoot, headingToChild };
}

function renderItemLabel(item: ArticleTocItem) {
  return item.labelHtml ? (
    <span dangerouslySetInnerHTML={{ __html: item.labelHtml }} />
  ) : (
    item.text
  );
}

export default function ArticleSplitToc({ items }: ArticleSplitTocProps) {
  const sections = items.filter((item) => item.headingDepth === 2);
  const firstSectionId = sections[0]?.id ?? null;
  const [activeId, setActiveId] = useState<string | null>(firstSectionId);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { headingToRoot, headingToChild } = useMemo(
    () => buildHeadingMaps(items),
    [items],
  );
  const observedIds = useMemo(
    () => flattenItems(items).map((item) => item.id),
    [items],
  );

  const activeSectionId =
    headingToRoot.get(activeId ?? "") ?? firstSectionId;
  const activeSection =
    sections.find((item) => item.id === activeSectionId) ?? sections[0];
  const activeChildId = headingToChild.get(activeId ?? "") ?? null;
  const activeChildren =
    activeSection?.children.filter((item) => item.headingDepth === 3) ?? [];

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const visibleHeadings = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleHeadings.set(entry.target.id, entry.boundingClientRect.top);
          } else {
            visibleHeadings.delete(entry.target.id);
          }
        }

        const current = [...visibleHeadings.entries()].sort(
          ([, leftTop], [, rightTop]) => rightTop - leftTop,
        )[0];
        if (current) setActiveId(current[0]);
      },
      {
        rootMargin: "-18% 0px -65% 0px",
        threshold: [0, 0.5, 1],
      },
    );

    for (const id of observedIds) {
      const heading = document.getElementById(id);
      if (heading) observer.observe(heading);
    }

    return () => observer.disconnect();
  }, [observedIds]);

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  if (sections.length === 0) return null;

  function handleAnchorClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    setActiveId(id);

    const heading = document.getElementById(id);
    if (!heading) return;

    window.history.pushState(null, "", `#${id}`);
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    heading.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
    setMobileOpen(false);
  }

  function renderSectionLink(item: ArticleTocItem) {
    return (
      <li
        className={`article-split-toc-item${
          activeSectionId === item.id ? " is-active" : ""
        }`}
        key={item.id}
      >
        <a
          className="article-split-toc-link"
          href={`#${item.id}`}
          aria-current={activeSectionId === item.id ? "location" : undefined}
          onClick={(event) => handleAnchorClick(event, item.id)}
        >
          {renderItemLabel(item)}
        </a>
      </li>
    );
  }

  function renderChildLink(item: ArticleTocItem) {
    return (
      <li
        className={`article-split-toc-item${
          activeChildId === item.id ? " is-active" : ""
        }`}
        key={item.id}
      >
        <a
          className="article-split-toc-link"
          href={`#${item.id}`}
          aria-current={activeChildId === item.id ? "location" : undefined}
          onClick={(event) => handleAnchorClick(event, item.id)}
        >
          {renderItemLabel(item)}
        </a>
      </li>
    );
  }

  return (
    <nav className="article-split-toc" aria-label="文章目录">
      <div className="article-split-toc-column article-split-toc-sections">
        <p className="article-split-toc-label">SECTIONS</p>
        <ul className="article-split-toc-list">
          {sections.map(renderSectionLink)}
        </ul>
      </div>

      <div className="article-split-toc-column article-split-toc-current">
        <p className="article-split-toc-label">IN THIS SECTION</p>
        <p className="article-split-toc-current-title">
          {renderItemLabel(activeSection)}
        </p>
        {activeChildren.length > 0 ? (
          <ul className="article-split-toc-list">
            {activeChildren.map(renderChildLink)}
          </ul>
        ) : (
          <p className="article-split-toc-empty">暂无小节</p>
        )}
      </div>

      <button
        className="article-split-toc-mobile-trigger"
        type="button"
        aria-controls="article-split-toc-mobile-content"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((current) => !current)}
      >
        <span>目录</span>
        <span className="article-split-toc-mobile-current">
          {renderItemLabel(activeSection)}
        </span>
        <span aria-hidden="true">{mobileOpen ? "−" : "+"}</span>
      </button>

      <button
        className={`article-split-toc-mobile-backdrop${
          mobileOpen ? " is-open" : ""
        }`}
        type="button"
        aria-hidden={!mobileOpen}
        aria-label="关闭文章目录"
        tabIndex={mobileOpen ? 0 : -1}
        onClick={() => setMobileOpen(false)}
      />

      <div
        className={`article-split-toc-mobile-content${
          mobileOpen ? " is-open" : ""
        }`}
        id="article-split-toc-mobile-content"
      >
        <p className="article-split-toc-label">SECTIONS</p>
        <ul className="article-split-toc-list">
          {sections.map(renderSectionLink)}
        </ul>
        <p className="article-split-toc-label article-split-toc-mobile-subtitle">
          IN THIS SECTION
        </p>
        <p className="article-split-toc-current-title">
          {renderItemLabel(activeSection)}
        </p>
        {activeChildren.length > 0 ? (
          <ul className="article-split-toc-list">
            {activeChildren.map(renderChildLink)}
          </ul>
        ) : null}
      </div>
    </nav>
  );
}

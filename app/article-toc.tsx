"use client";

import { useEffect, useMemo, useState } from "react";
import type { ArticleTocItem } from "./article-outline.ts";

type ArticleTocProps = {
  items: ArticleTocItem[];
};

function buildHeadingToRootMap(items: ArticleTocItem[]) {
  const map = new Map<string, string>();

  function visit(item: ArticleTocItem, rootId: string) {
    map.set(item.id, rootId);
    for (const child of item.children) visit(child, rootId);
  }

  for (const item of items) visit(item, item.id);
  return map;
}

function flattenItems(items: ArticleTocItem[]): ArticleTocItem[] {
  return items.flatMap((item) => [item, ...flattenItems(item.children)]);
}

export default function ArticleToc({ items }: ArticleTocProps) {
  const firstRootId = items[0]?.id ?? null;
  const [openRootId, setOpenRootId] = useState<string | null>(firstRootId);
  const [openChildIds, setOpenChildIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [activeId, setActiveId] = useState<string | null>(firstRootId);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headingToRoot = useMemo(() => buildHeadingToRootMap(items), [items]);
  const observedIds = useMemo(
    () => flattenItems(items).map((item) => item.id),
    [items],
  );
  const activeLabel = useMemo(
    () =>
      flattenItems(items).find((item) => item.id === activeId)?.text ??
      "文章目录",
    [activeId, items],
  );

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
        if (!current) return;

        const [currentId] = current;
        setActiveId(currentId);
        const rootId = headingToRoot.get(currentId);
        if (rootId) setOpenRootId(rootId);
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
  }, [headingToRoot, observedIds]);

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

  if (items.length === 0) return null;

  function handleRootToggle(id: string) {
    setOpenRootId((currentId) => (currentId === id ? null : id));
    setOpenChildIds(new Set());
  }

  function handleChildToggle(id: string) {
    setOpenChildIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(id)) nextIds.delete(id);
      else nextIds.add(id);
      return nextIds;
    });
  }

  function handleAnchorClick(
    event: React.MouseEvent<HTMLAnchorElement>,
    id: string,
  ) {
    event.preventDefault();
    setActiveId(id);

    const rootId = headingToRoot.get(id);
    if (rootId) setOpenRootId(rootId);

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

  function renderNestedItem(item: ArticleTocItem) {
    const hasChildren = item.children.length > 0;
    const childGroupId = `article-toc-group-${item.id}`;
    const isOpen = openChildIds.has(item.id);

    return (
      <li
        className={`article-toc-item article-toc-item-level-${item.level}${
          activeId === item.id ? " is-active" : ""
        }`}
        key={item.id}
      >
        <div className="article-toc-row">
          <a
            className="article-toc-link"
            data-level={item.level}
            href={`#${item.id}`}
            aria-current={activeId === item.id ? "location" : undefined}
            onClick={(event) => handleAnchorClick(event, item.id)}
          >
            {item.labelHtml ? (
              <span dangerouslySetInnerHTML={{ __html: item.labelHtml }} />
            ) : (
              item.text
            )}
          </a>
          {hasChildren ? (
            <button
              className="article-toc-toggle"
              type="button"
              aria-controls={childGroupId}
              aria-expanded={isOpen}
              aria-label={`${isOpen ? "收起" : "展开"} ${item.text}`}
              onClick={() => handleChildToggle(item.id)}
            >
              <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
            </button>
          ) : null}
        </div>
        {hasChildren ? (
          <ul
            className="article-toc-list article-toc-children"
            id={childGroupId}
            aria-label={`${item.text} 下级目录`}
            hidden={!isOpen}
          >
            {item.children.map((child) => renderNestedItem(child))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <nav className="article-toc" aria-label="文章目录">
      <button
        className="article-toc-mobile-trigger"
        type="button"
        aria-controls="article-toc-content"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((current) => !current)}
      >
        <span>文章目录</span>
        <span className="article-toc-mobile-current">{activeLabel}</span>
        <span aria-hidden="true">{mobileOpen ? "−" : "+"}</span>
      </button>

      <button
        className={`article-toc-mobile-backdrop${
          mobileOpen ? " is-open" : ""
        }`}
        type="button"
        aria-hidden={!mobileOpen}
        aria-label="关闭文章目录"
        tabIndex={mobileOpen ? 0 : -1}
        onClick={() => setMobileOpen(false)}
      />

      <div
        className={`article-toc-content${mobileOpen ? " is-open" : ""}`}
        id="article-toc-content"
      >
        <ul className="article-toc-list article-toc-list-root">
          {items.map((item) => {
            const hasChildren = item.children.length > 0;
            const groupId = `article-toc-group-${item.id}`;
            const isOpen = openRootId === item.id;

            return (
              <li
                className={`article-toc-item article-toc-item-root${
                  activeId === item.id ? " is-active" : ""
                }`}
                key={item.id}
              >
                <div className="article-toc-row">
                  <a
                    className="article-toc-link"
                    data-level={item.level}
                    href={`#${item.id}`}
                    aria-current={
                      activeId === item.id ? "location" : undefined
                    }
                    onClick={(event) => handleAnchorClick(event, item.id)}
                  >
                    {item.labelHtml ? (
                      <span
                        dangerouslySetInnerHTML={{ __html: item.labelHtml }}
                      />
                    ) : (
                      item.text
                    )}
                  </a>
                  {hasChildren ? (
                    <button
                      className="article-toc-toggle"
                      type="button"
                      aria-controls={groupId}
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? "收起" : "展开"} ${item.text}`}
                      onClick={() => handleRootToggle(item.id)}
                    >
                      <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
                    </button>
                  ) : null}
                </div>
                {hasChildren ? (
                  <ul
                    className="article-toc-list article-toc-children"
                    id={groupId}
                    aria-label={`${item.text} 下级目录`}
                    hidden={!isOpen}
                  >
                    {item.children.map((child) => renderNestedItem(child))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

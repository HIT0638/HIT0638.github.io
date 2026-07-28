import assert from "node:assert/strict";
import test from "node:test";
import remarkParse from "remark-parse";
import { unified } from "unified";
import {
  annotateArticleHeadings,
  parseArticleTocConfig,
  type ArticleTocConfig,
  type ArticleTocItem,
  type MarkdownRoot,
} from "../app/article-outline.ts";
import { renderMarkdown } from "../app/markdown.ts";

const parseMarkdown = (source: string): MarkdownRoot =>
  unified().use(remarkParse).parse(source) as MarkdownRoot;

function headingNodes(root: MarkdownRoot): MarkdownRoot[] {
  return (root.children ?? []).filter((node) => node.type === "heading");
}

function flatten(items: ArticleTocItem[]): ArticleTocItem[] {
  return items.flatMap((item) => [item, ...flatten(item.children)]);
}

test("uses depth 3 by default and excludes H1", () => {
  const root = parseMarkdown(
    [
      "# Article title",
      "",
      "## First section",
      "",
      "### First topic",
      "",
      "#### First detail",
      "",
      "## Second section",
    ].join("\n"),
  );

  const toc = annotateArticleHeadings(root, parseArticleTocConfig({}));

  assert.deepEqual(
    toc.map((item) => item.text),
    ["First section", "Second section"],
  );
  assert.deepEqual(toc[0].children[0].children[0].text, "First detail");
  assert.equal(toc[0].level, 1);
  assert.equal(toc[0].children[0].level, 2);
  assert.equal(toc[0].children[0].children[0].level, 3);
  assert.equal(headingNodes(root)[0].data?.hProperties?.id, undefined);
  assert.equal(headingNodes(root)[1].data?.hProperties?.id, "first-section");
});

test("supports compact depth 2 and can disable the visible TOC", () => {
  const source = "## Section\n\n### Topic\n\n#### Detail";
  const root = parseMarkdown(source);
  const compact = annotateArticleHeadings(
    root,
    parseArticleTocConfig({ tocDepth: "2" }),
  );

  assert.deepEqual(flatten(compact).map((item) => item.text), [
    "Section",
    "Topic",
  ]);
  assert.equal(headingNodes(root)[2].data?.hProperties?.id, "detail");

  const disabledRoot = parseMarkdown(source);
  const disabledConfig: ArticleTocConfig = parseArticleTocConfig({
    toc: "FALSE",
  });
  assert.equal(disabledConfig.enabled, false);
  assert.deepEqual(annotateArticleHeadings(disabledRoot, disabledConfig), []);
  assert.equal(
    headingNodes(disabledRoot)[0].data?.hProperties?.id,
    "section",
  );
});

test("allocates unique IDs for duplicate and punctuation-heavy headings", () => {
  const root = parseMarkdown(
    [
      "## Repeated heading",
      "## Repeated heading",
      "## Repeated-heading",
      "## 🚀 中文 / \\(\\omega\\)",
      "## 🚀 中文 / \\(\\omega\\)",
      "## 🚀",
    ].join("\n\n"),
  );

  const toc = annotateArticleHeadings(root);

  assert.deepEqual(
    flatten(toc).map((item) => item.id),
    [
      "repeated-heading",
      "repeated-heading-2",
      "repeated-heading-3",
      "中文-omega",
      "中文-omega-2",
      "section-6",
    ],
  );
});

test("does not collect headings written inside fenced code", () => {
  const root = parseMarkdown(
    [
      "```md",
      "## Fake heading",
      "```",
      "",
      "## Real heading",
    ].join("\n"),
  );

  const toc = annotateArticleHeadings(root);

  assert.deepEqual(flatten(toc).map((item) => item.text), ["Real heading"]);
  assert.equal(
    (root.children ?? []).some(
      (node) => node.type === "code" && node.value?.includes("Fake heading"),
    ),
    true,
  );
});

test("front matter accepts only exact false for disabling and only 2 for compact depth", () => {
  assert.deepEqual(parseArticleTocConfig({}), {
    enabled: true,
    depth: 3,
  });
  assert.deepEqual(parseArticleTocConfig({ toc: " false " }), {
    enabled: false,
    depth: 3,
  });
  assert.equal(parseArticleTocConfig({ toc: "0" }).enabled, true);
  assert.equal(parseArticleTocConfig({ tocDepth: "2" }).depth, 2);
  assert.equal(parseArticleTocConfig({ tocDepth: "4" }).depth, 3);
});

test("renders matching heading IDs and returns a nested TOC", async () => {
  const rendered = await renderMarkdown(
    [
      "# Ignored page title",
      "",
      "## First section",
      "",
      "### A topic",
      "",
      "#### A detail",
      "",
      "## First section",
    ].join("\n"),
    parseArticleTocConfig({}),
  );

  assert.match(rendered.html, /<h2 id="first-section">First section<\/h2>/);
  assert.match(rendered.html, /<h3 id="a-topic">A topic<\/h3>/);
  assert.match(rendered.html, /<h4 id="a-detail">A detail<\/h4>/);
  assert.match(
    rendered.html,
    /<h2 id="first-section-2">First section<\/h2>/,
  );
  assert.deepEqual(
    rendered.toc.map((item) => [
      item.id,
      item.children.map((child) => [
        child.id,
        child.children.map((grandchild) => grandchild.id),
      ]),
    ]),
    [
      ["first-section", [["a-topic", ["a-detail"]]]],
      ["first-section-2", []],
    ],
  );
  assert.doesNotMatch(rendered.html, /<h1[^>]*id=/);
});

test("keeps math and Mermaid source compatible when TOC is disabled", async () => {
  const rendered = await renderMarkdown(
    [
      "## Probability $\\omega$",
      "",
      "$$",
      "P(X = k) = \\binom{n}{k}p^k(1-p)^{n-k}",
      "$$",
      "",
      "```mermaid",
      "flowchart TD",
      "    start_node[Start] --> end_node[End]",
      "```",
    ].join("\n"),
    parseArticleTocConfig({ toc: "false" }),
  );

  assert.deepEqual(rendered.toc, []);
  assert.match(rendered.html, /<h2 id="probability-omega">/);
  assert.match(rendered.html, /class="katex"/);
  assert.match(rendered.html, /class="katex-display"/);
  assert.match(rendered.html, /<code class="language-mermaid">/);
  assert.match(rendered.html, /flowchart TD/);
});

test("handles sparse heading structures without mutating the Markdown source", async () => {
  const source = [
    "A paragraph before any headings.",
    "",
    "### Topic without a parent",
    "",
    "#### Detail without a parent",
    "",
    "## A flat section",
    "",
    "```md",
    "## Heading inside code",
    "```",
  ].join("\n");
  const originalSource = source;

  const rendered = await renderMarkdown(source, parseArticleTocConfig({}));

  assert.equal(source, originalSource);
  assert.deepEqual(
    rendered.toc.map((item) => [
      item.text,
      item.children.map((child) => child.text),
    ]),
    [
      ["Topic without a parent", ["Detail without a parent"]],
      ["A flat section", []],
    ],
  );

  const noHeading = await renderMarkdown(
    "Only a paragraph, with no structural headings.",
    parseArticleTocConfig({}),
  );
  assert.deepEqual(noHeading.toc, []);
});

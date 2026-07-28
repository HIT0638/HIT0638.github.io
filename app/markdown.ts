import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import {
  annotateArticleHeadings,
  type ArticleTocConfig,
  type ArticleTocItem,
  type MarkdownRoot,
} from "./article-outline.ts";

type HtmlNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HtmlNode[];
};

function collectHeadingLabelHtml(root: HtmlNode): Map<string, string> {
  const labels = new Map<string, string>();

  function visit(node: HtmlNode) {
    if (
      node.type === "element" &&
      /^(h2|h3|h4)$/.test(node.tagName ?? "")
    ) {
      const id = node.properties?.id;
      if (typeof id === "string") {
        const fragment = {
          type: "root",
          children: node.children ?? [],
        } as never;
        labels.set(id, String(markdownProcessor.stringify(fragment)));
      }
    }

    for (const child of node.children ?? []) visit(child);
  }

  visit(root);
  return labels;
}

function addHeadingLabelHtml(
  items: ArticleTocItem[],
  labels: Map<string, string>,
): ArticleTocItem[] {
  return items.map((item) => ({
    ...item,
    labelHtml: labels.get(item.id) ?? item.labelHtml,
    children: addHeadingLabelHtml(item.children, labels),
  }));
}

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype)
  .use(rehypeKatex, { throwOnError: false })
  .use(rehypeStringify);

function normalizeMathDelimiters(source: string) {
  let fence: string | null = null;

  return source
    .split(/\r?\n/)
    .map((line) => {
      const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);

      if (fenceMatch) {
        const marker = fenceMatch[1][0];

        if (fence === null) {
          fence = marker;
        } else if (fence === marker) {
          fence = null;
        }

        return line;
      }

      if (fence !== null) return line;

      return line
        .replaceAll("\\[", () => "$$")
        .replaceAll("\\]", () => "$$")
        .replaceAll("\\(", "$")
        .replaceAll("\\)", "$");
    })
    .join("\n");
}

export type RenderedMarkdown = {
  html: string;
  toc: ArticleTocItem[];
};

export async function renderMarkdown(
  source: string,
  tocConfig: ArticleTocConfig,
): Promise<RenderedMarkdown> {
  const tree = markdownProcessor.parse(
    normalizeMathDelimiters(source),
  ) as MarkdownRoot;
  const toc = annotateArticleHeadings(tree, tocConfig);
  const transformedTree = await markdownProcessor.run(tree);
  const labels = collectHeadingLabelHtml(transformedTree as HtmlNode);

  return {
    html: String(markdownProcessor.stringify(transformedTree)),
    toc: addHeadingLabelHtml(toc, labels),
  };
}

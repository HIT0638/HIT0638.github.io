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
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeKatex, { throwOnError: false })
  .use(rehypeStringify, { allowDangerousHtml: true });

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
        // MkDocs content commonly uses `${dt}` as a SQL template
        // placeholder. Without escaping it, remark-math may pair the `$`
        // characters across paragraphs and send ordinary prose to KaTeX.
        .replace(/\$\{[^}\r\n]+\}/g, (placeholder) => `\\${placeholder}`)
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

export type RenderMarkdownOptions = {
  expandMkdocsAdmonitions?: boolean;
};

function escapeHtml(value: string) {
  return value.replace(
    /[&<>\"]|'/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

async function expandMkdocsAdmonitions(source: string) {
  const lines = source.split(/\r?\n/);
  const output: string[] = [];
  let fence: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);

    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      fence = fence === marker ? null : fence ?? marker;
      output.push(line);
      continue;
    }

    const admonition =
      fence === null
        ? line.match(
            /^(\?{3}\+?|!!!)\s+([A-Za-z][\w-]*)(?:\s+"([^"]*)")?\s*$/,
          )
        : null;

    if (!admonition) {
      output.push(line);
      continue;
    }

    const [, marker, kind, rawTitle] = admonition;
    const body: string[] = [];
    let nextIndex = index + 1;

    while (nextIndex < lines.length) {
      const bodyLine = lines[nextIndex];

      if (bodyLine.trim() === "") {
        body.push("");
        nextIndex += 1;
        continue;
      }

      if (/^(?: {4}|\t)/.test(bodyLine)) {
        body.push(bodyLine.startsWith("\t") ? bodyLine.slice(1) : bodyLine.slice(4));
        nextIndex += 1;
        continue;
      }

      break;
    }

    const title = rawTitle?.trim() || kind;
    const bodySource = body.join("\n").trim();
    const renderedBody = bodySource
      ? await renderMarkdown(
          bodySource,
          { enabled: false, depth: 3 },
          { expandMkdocsAdmonitions: true },
        )
      : { html: "", toc: [] };
    const className = `article-admonition article-admonition-${kind}`;

    if (marker.startsWith("???")) {
      const open = marker.endsWith("+") ? " open" : "";
      output.push(
        `<details class="${className}"${open}><summary>${escapeHtml(
          title,
        )}</summary>${renderedBody.html}</details>`,
      );
    } else {
      output.push(
        `<aside class="${className}"><p class="article-admonition-title">${escapeHtml(
          title,
        )}</p>${renderedBody.html}</aside>`,
      );
    }

    index = nextIndex - 1;
  }

  return output.join("\n");
}

async function renderMarkdownInternal(
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

export async function renderMarkdown(
  source: string,
  tocConfig: ArticleTocConfig,
  options: RenderMarkdownOptions = {},
): Promise<RenderedMarkdown> {
  const preparedSource = options.expandMkdocsAdmonitions
    ? await expandMkdocsAdmonitions(source)
    : source;

  return renderMarkdownInternal(preparedSource, tocConfig);
}

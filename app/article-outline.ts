export type TocDepth = 2 | 3;

export type ArticleTocConfig = {
  enabled: boolean;
  depth: TocDepth;
};

export type ArticleTocItem = {
  id: string;
  text: string;
  labelHtml?: string;
  headingDepth: 2 | 3 | 4;
  level: 1 | 2 | 3;
  children: ArticleTocItem[];
};

export type MarkdownRoot = {
  type: string;
  depth?: number;
  value?: string;
  alt?: string;
  children?: MarkdownRoot[];
  data?: {
    hProperties?: Record<string, string>;
  };
};

const DEFAULT_TOC_CONFIG: ArticleTocConfig = {
  enabled: true,
  depth: 3,
};

export function parseArticleTocConfig(
  frontMatter: Record<string, string>,
): ArticleTocConfig {
  return {
    enabled: frontMatter.toc?.trim().toLowerCase() !== "false",
    depth: frontMatter.tocDepth?.trim() === "2" ? 2 : 3,
  };
}

function collectHeadingText(node: MarkdownRoot): string {
  if (node.type === "image" && node.alt) return node.alt;
  if (typeof node.value === "string") return node.value;

  return (node.children ?? []).map(collectHeadingText).join("");
}

function headingIdBase(text: string, fallbackNumber: number): string {
  let id = "";
  let separatorPending = false;

  for (const character of text.normalize("NFKC")) {
    if (/[^\p{L}\p{N}]/u.test(character)) {
      if (/[-_\s]/u.test(character)) separatorPending = true;
      continue;
    }

    if (separatorPending && id.length > 0) id += "-";
    id += character.toLowerCase();
    separatorPending = false;
  }

  return id || `section-${fallbackNumber}`;
}

function allocateHeadingId(
  text: string,
  fallbackNumber: number,
  usedIds: Set<string>,
  nextSuffixes: Map<string, number>,
): string {
  const base = headingIdBase(text, fallbackNumber);
  let suffix = nextSuffixes.get(base) ?? 1;
  let candidate = suffix === 1 ? base : `${base}-${suffix}`;

  while (usedIds.has(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  usedIds.add(candidate);
  nextSuffixes.set(base, suffix + 1);
  return candidate;
}

function isHeadingDepth(depth: number | undefined): depth is 2 | 3 | 4 {
  return depth === 2 || depth === 3 || depth === 4;
}

export function annotateArticleHeadings(
  root: MarkdownRoot,
  config: ArticleTocConfig = DEFAULT_TOC_CONFIG,
): ArticleTocItem[] {
  const rootItems: ArticleTocItem[] = [];
  const stack: Array<{ depth: 2 | 3 | 4; item: ArticleTocItem }> = [];
  const usedIds = new Set<string>();
  const nextSuffixes = new Map<string, number>();
  let headingNumber = 0;

  function visit(node: MarkdownRoot) {
    if (node.type === "heading" && isHeadingDepth(node.depth)) {
      headingNumber += 1;
      const headingDepth = node.depth;
      const text = collectHeadingText(node).replace(/\s+/g, " ").trim();
      const id = allocateHeadingId(
        text,
        headingNumber,
        usedIds,
        nextSuffixes,
      );

      node.data = {
        ...node.data,
        hProperties: {
          ...node.data?.hProperties,
          id,
        },
      };

      if (config.enabled && headingDepth <= config.depth + 1) {
        const item: ArticleTocItem = {
          id,
          text,
          headingDepth,
          level: (headingDepth - 1) as 1 | 2 | 3,
          children: [],
        };

        while (
          stack.length > 0 &&
          stack[stack.length - 1].depth >= headingDepth
        ) {
          stack.pop();
        }

        const parent = stack[stack.length - 1];
        if (parent) {
          parent.item.children.push(item);
        } else {
          rootItems.push(item);
        }

        stack.push({ depth: headingDepth, item });
      }
    }

    for (const child of node.children ?? []) visit(child);
  }

  visit(root);
  return rootItems;
}

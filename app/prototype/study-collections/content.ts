import {
  renderMarkdown,
  type RenderedMarkdown,
} from "../../markdown";
import { collections, type Collection } from "./data";

type RawFiles = Record<string, string>;

const rawDocs = import.meta.glob(
  "../../../content/collections/*/docs/**/*.md",
  { eager: true, import: "default", query: "?raw" },
) as RawFiles;

const rawCode = import.meta.glob(
  "../../../content/collections/*/code/**/*",
  { eager: true, import: "default", query: "?raw" },
) as RawFiles;

function buildContentMap(files: RawFiles, folder: "docs" | "code") {
  const content = new Map<string, string>();

  for (const [sourcePath, source] of Object.entries(files)) {
    const match = sourcePath.match(
      /content\/collections\/([^/]+)\/(?:docs|code)\/(.+)$/,
    );
    if (!match) continue;

    content.set(`${match[1]}/${folder}/${match[2]}`, source);
  }

  return content;
}

const docs = buildContentMap(rawDocs, "docs");
const code = buildContentMap(rawCode, "code");

export type CollectionDocument = {
  slug: string;
  path: string;
  title: string;
  source: string;
};

export type CollectionCodeFile = {
  slug: string;
  path: string;
  title: string;
  language: string;
  source: string;
};

function findTitle(source: string, fallback: string) {
  return source.match(/^#\s+([^\r\n]+)/m)?.[1].trim() ?? fallback;
}

function getRawDocument(slug: string, path: string) {
  const source = docs.get(`${slug}/docs/${path}`);
  if (!source) return null;

  return {
    slug,
    path,
    title: findTitle(source, path.replace(/\.md$/, "")),
    source,
  } satisfies CollectionDocument;
}

function expandCodeSnippet(
  slug: string,
  reference: string,
): string | null {
  const match = reference.match(/^(.*?)(?::(\d+):(\d+))?$/);
  if (!match) return null;

  const codePath = match[1].replace(/^code\//, "");
  const source = code.get(`${slug}/code/${codePath}`);
  if (!source) return null;

  const lines = source.replaceAll("\r\n", "\n").split("\n");
  const start = match[2] ? Number(match[2]) : 1;
  const end = match[3] ? Number(match[3]) : lines.length;
  return lines.slice(Math.max(start - 1, 0), end).join("\n");
}

function expandCodeSnippets(slug: string, source: string) {
  return source.replace(
    /^[ \t]*--8<--\s+"([^"]+)"[ \t]*$/gm,
    (match, reference: string) => {
      const expanded = expandCodeSnippet(slug, reference);
      if (expanded === null) return match;

      const indent = match.match(/^[ \t]*/)?.[0] ?? "";
      return expanded
        .split("\n")
        .map((line) => (line ? `${indent}${line}` : line))
        .join("\n");
    },
  );
}

function collectionRoute(slug: string, target: string) {
  const normalized = target.replace(/^\.\//, "");

  if (normalized.startsWith("code/")) {
    return `/prototype/study-collections/${slug}/code/${normalized.slice(
      "code/".length,
    )}`;
  }

  if (!normalized.endsWith(".md")) return null;

  if (normalized === "index.md") {
    return `/prototype/study-collections/${slug}`;
  }

  if (normalized.startsWith("reference/")) {
    return `/prototype/study-collections/${slug}/reference/${normalized
      .slice("reference/".length)
      .replace(/\.md$/, "")}`;
  }

  return `/prototype/study-collections/${slug}/${normalized.replace(
    /\.md$/,
    "",
  )}`;
}

function rewriteCollectionLinks(slug: string, source: string) {
  let inFence = false;

  return source
    .split("\n")
    .map((line) => {
      const fence = line.match(/^[ \t]*(`{3,}|~{3,})/);
      if (fence) inFence = !inFence;
      if (inFence || fence) return line;

      return line.replace(
        /\]\(([^)\s]+)(#[^)\s]+)?\)/g,
        (match, target: string, fragment = "") => {
          const route = collectionRoute(slug, target);
          return route ? `](${route}${fragment})` : match;
        },
      ).replace(
        /(\bhref\s*=\s*)(["'])([^"'#\s]+)(#[^"'\s]*)?\2/gi,
        (match, prefix: string, quote: string, target: string, fragment = "") => {
          const route = collectionRoute(slug, target);
          return route ? `${prefix}${quote}${route}${fragment}${quote}` : match;
        },
      );
    })
    .join("\n");
}

function prepareCollectionSource(slug: string, source: string) {
  return rewriteCollectionLinks(slug, expandCodeSnippets(slug, source));
}

export function getCollectionDocument(slug: string, path: string) {
  const document = getRawDocument(slug, path);
  if (!document) return null;

  return {
    ...document,
    source: prepareCollectionSource(slug, document.source),
  } satisfies CollectionDocument;
}

export function getCollectionCode(slug: string, path: string) {
  const source = code.get(`${slug}/code/${path}`);
  if (!source) return null;

  const extension = path.split(".").pop()?.toLowerCase() ?? "text";
  const language =
    extension === "java"
      ? "java"
      : extension === "md"
        ? "markdown"
        : extension;

  return {
    slug,
    path,
    title: path.split("/").pop() ?? path,
    language,
    source,
  } satisfies CollectionCodeFile;
}

export function getCollectionCodePaths(slug: string) {
  const prefix = `${slug}/code/`;

  return [...code.keys()]
    .filter((path) => path.startsWith(prefix))
    .map((path) => path.slice(prefix.length));
}

export async function renderCollectionDocument(
  document: CollectionDocument,
): Promise<RenderedMarkdown> {
  return renderMarkdown(
    document.source,
    { enabled: true, depth: 3 },
    { expandMkdocsAdmonitions: true },
  );
}

function documentPaths(collection: Collection) {
  return [
    "index.md",
    ...collection.supportPages.map((page) => page.path),
    ...collection.modules.map((module) => module.path),
    ...collection.references.map((reference) => reference.path),
  ];
}

export function getCollectionContentDiagnostics() {
  const missingDocuments: string[] = [];
  const missingSnippets: string[] = [];

  for (const collection of collections) {
    for (const path of documentPaths(collection)) {
      if (!docs.has(`${collection.slug}/docs/${path}`)) {
        missingDocuments.push(`${collection.slug}/docs/${path}`);
      }
    }

    for (const [sourcePath, source] of Object.entries(rawDocs)) {
      if (!sourcePath.includes(`/collections/${collection.slug}/`)) continue;

      for (const match of source.matchAll(
        /^[ \t]*--8<--\s+"([^"]+)"[ \t]*$/gm,
      )) {
        if (expandCodeSnippet(collection.slug, match[1]) === null) {
          missingSnippets.push(`${collection.slug}: ${match[1]}`);
        }
      }
    }
  }

  return { missingDocuments, missingSnippets };
}

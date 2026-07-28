/// <reference types="vite/client" />

export type Article = {
  title: string;
  date: string;
  summary?: string;
  slug: string;
  body: string;
};

const rawNotes = import.meta.glob("../content/notes/*.md", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

function parseArticle(path: string, source: string): Article | null {
  const frontMatterMatch = source.match(
    /^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/,
  );

  if (!frontMatterMatch) return null;

  const frontMatter = Object.fromEntries(
    frontMatterMatch[1]
      .split(/\r?\n/)
      .map((line) => {
        const separator = line.indexOf(":");
        if (separator < 0) return null;

        const key = line.slice(0, separator).trim();
        const value = line
          .slice(separator + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");

        return [key, value] as const;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null),
  );

  if (
    !frontMatter.title ||
    !frontMatter.date ||
    frontMatter.draft?.toLowerCase() === "true"
  ) {
    return null;
  }

  const fileName = path.split("/").pop() ?? frontMatter.title;

  return {
    title: frontMatter.title,
    date: frontMatter.date,
    summary: frontMatter.summary,
    slug: fileName.replace(/\.md$/, ""),
    body: source.slice(frontMatterMatch[0].length).trim(),
  };
}

export const articles = Object.entries(rawNotes)
  .map(([path, source]) => parseArticle(path, source))
  .filter((article): article is Article => article !== null)
  .sort((left, right) => right.date.localeCompare(left.date));

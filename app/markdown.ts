import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

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

export async function renderMarkdown(source: string) {
  const file = await markdownProcessor.process(
    normalizeMathDelimiters(source),
  );
  return String(file);
}

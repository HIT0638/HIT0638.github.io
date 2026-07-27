import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../../articles";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = articles.find((item) => item.slug === slug);

  return {
    title: article ? `${article.title} — Lero β` : "文章 — Lero β",
    description: article?.title,
  };
}

function renderArticleBody(body: string) {
  return body.split(/\n{2,}/).map((block, index) => {
    const lines = block.trim().split(/\r?\n/);
    const firstLine = lines[0] ?? "";
    const text = lines.slice(1).join(" ");

    if (firstLine.startsWith("## ")) {
      return <h2 key={index}>{firstLine.slice(3)}</h2>;
    }

    if (firstLine.startsWith("# ")) {
      return <h2 key={index}>{firstLine.slice(2)}</h2>;
    }

    if (firstLine.startsWith("```") && lines.at(-1) === "```") {
      return (
        <pre key={index}>
          <code>{lines.slice(1, -1).join("\n")}</code>
        </pre>
      );
    }

    return <p key={index}>{[firstLine, text].filter(Boolean).join(" ")}</p>;
  });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = articles.find((item) => item.slug === slug);

  if (!article) {
    return (
      <main className="article-page-shell">
        <p>这篇文章还没有找到。</p>
        <Link href="/">返回文章列表</Link>
      </main>
    );
  }

  return (
    <main className="article-page-shell">
      <header className="article-page-header">
        <Link className="article-page-back" href="/">
          ← Lero β / 文章
        </Link>
        <time dateTime={article.date}>{article.date.replaceAll("-", ".")}</time>
      </header>

      <article className="article-page-content">
        <h1>{article.title}</h1>
        <div className="article-body">{renderArticleBody(article.body)}</div>
      </article>
    </main>
  );
}

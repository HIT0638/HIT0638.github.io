import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../../articles";
import { renderMarkdown } from "../../markdown";

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

  const articleHtml = await renderMarkdown(article.body);

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
        <div
          className="article-body"
          dangerouslySetInnerHTML={{ __html: articleHtml }}
        />
      </article>
    </main>
  );
}

import { articles } from "./articles";

export default function Home() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="返回首页">
          <span className="brand-mark brand-mark-beta">
            L<span className="brand-beta">β</span>
          </span>
          <span className="brand-name">Lero β</span>
        </a>
        <span className="header-context">articles / archive</span>
      </header>

      <div id="top" className="hero-section">
        <section
          id="articles"
          className="article-list-panel"
          aria-labelledby="articles-title"
        >
          <div className="article-list-heading">
            <div>
              <p className="section-kicker">Lero β / still becoming</p>
              <h1 id="articles-title">文章</h1>
            </div>
            <span className="article-count">{articles.length} 篇</span>
          </div>

          <div className="article-list" role="list">
            {articles.map((article) => (
              <a
                className="article-row"
                href={`/articles/${article.slug}`}
                key={article.slug}
                role="listitem"
              >
                <h2>{article.title}</h2>
                <time
                  className="article-date"
                  dateTime={article.date}
                >
                  {article.date.replaceAll("-", ".")}
                </time>
                <span className="article-arrow" aria-hidden="true">
                  ↗
                </span>
              </a>
            ))}
          </div>
        </section>

        <div className="hero-card" aria-label="Lero β 的简介摘要">
          <div className="card-orbit orbit-one" aria-hidden="true" />
          <div className="card-orbit orbit-two" aria-hidden="true" />
          <div className="card-topline">
            <span>PERSONAL ARCHIVE</span>
            <span>Lero β</span>
          </div>
          <div className="portrait-placeholder">
            <span className="portrait-initials">Lβ</span>
            <span className="portrait-caption">still in beta</span>
          </div>
          <div className="card-meta">
            <div>
              <span className="meta-label">中文名</span>
              <strong>李斌</strong>
            </div>
            <div>
              <span className="meta-label">署名</span>
              <strong>Lero β.</strong>
            </div>
          </div>
        </div>
      </div>

      <footer className="site-footer">
        <span>© 2025 Lero β. Made with care.</span>
        <span>articles / archive</span>
      </footer>
    </main>
  );
}

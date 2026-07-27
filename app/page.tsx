const articles = [
  {
    number: "01",
    title: "关于开始记录这件事",
    date: "2026.07.27",
  },
  {
    number: "02",
    title: "如何把一个想法慢慢做出来",
    date: "2026.07.18",
  },
  {
    number: "03",
    title: "一些还在形成中的问题",
    date: "2026.06.30",
  },
];

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
              <article className="article-row" key={article.number} role="listitem">
                <span className="article-number">{article.number}</span>
                <div className="article-main">
                  <h2>{article.title}</h2>
                  <div className="article-meta">
                    <time dateTime={article.date.replaceAll(".", "-")}>
                      {article.date}
                    </time>
                  </div>
                </div>
                <span className="article-arrow" aria-hidden="true">
                  ↗
                </span>
              </article>
            ))}
          </div>
        </section>

        <div className="hero-card" aria-label="Lero β 的简介摘要">
          <div className="card-orbit orbit-one" aria-hidden="true" />
          <div className="card-orbit orbit-two" aria-hidden="true" />
          <div className="card-topline">
            <span>NAME STUDY / 001</span>
            <span>Lero β</span>
          </div>
          <div className="portrait-placeholder">
            <span className="portrait-initials">Lβ</span>
            <span className="portrait-caption">still in beta</span>
          </div>
          <div className="card-meta">
            <div>
              <span className="meta-label">署名</span>
              <strong>Lero β</strong>
            </div>
            <div>
              <span className="meta-label">读法</span>
              <strong>Lero / 诶罗</strong>
            </div>
          </div>
          <p className="card-note">
            “不是匿名，是选择一种更自由的署名。”
          </p>
        </div>
      </div>

      <footer className="site-footer">
        <span>© 2025 Lero β. Made with care.</span>
        <span>articles / archive</span>
      </footer>
    </main>
  );
}

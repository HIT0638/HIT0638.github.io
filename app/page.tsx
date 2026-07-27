const projects = [
  {
    number: "01",
    type: "PRODUCT / 2024",
    title: "把复杂的工作流，变成清晰的下一步",
    description:
      "为一个需要跨团队协作的工具重新梳理信息架构，让关键动作更快被找到，也更容易被完成。",
    tags: ["产品设计", "信息架构", "体验优化"],
  },
  {
    number: "02",
    type: "DATA / 2023",
    title: "让数据开始讲人话",
    description:
      "从零搭建一套轻量的数据观察面板，把每天发生的变化整理成团队真正能用来判断的信号。",
    tags: ["数据可视化", "分析", "自动化"],
  },
  {
    number: "03",
    type: "SIDE PROJECT / NOW",
    title: "一个持续更新的数字工作台",
    description:
      "记录正在学习的东西、正在验证的想法，以及那些值得被分享的小实验。",
    tags: ["研究", "写作", "独立制作"],
  },
];

const principles = [
  ["01", "先把问题说清楚", "好的结果通常从一个被准确描述的问题开始。"],
  ["02", "让系统保持有温度", "效率很重要，但被理解、被照顾同样重要。"],
  ["03", "持续交付小而好的东西", "让想法落地，才有机会在真实世界里变得更好。"],
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

        <nav className="site-nav" aria-label="主导航">
          <a href="#work">作品</a>
          <a href="#about">关于</a>
          <a href="#contact">联系</a>
        </nav>

        <a className="availability" href="#contact">
          <span className="availability-dot" aria-hidden="true" />
          开放交流
        </a>
      </header>

      <div id="top" className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="eyebrow-line" aria-hidden="true" />
            Lero β / still becoming
          </p>
          <h1>
            还没有最终版本，
            <em>正好。</em>
          </h1>
          <p className="hero-intro">
            你好，我是 Lero β，读作“诶罗”。
            这里记录我在产品、数据和表达之间，持续做的一些实验。
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#work">
              查看精选作品 <span aria-hidden="true">↘</span>
            </a>
            <a className="text-link" href="mailto:hello@example.com">
              hello@example.com <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        <div className="hero-card" aria-label="个人简介摘要">
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
              <span className="meta-label">中文名</span>
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

      <div className="ticker" aria-label="个人关键词">
        <div className="ticker-track">
          <span>CURIOUS BY DEFAULT</span>
          <span className="ticker-symbol">✳</span>
          <span>MAKE IT USEFUL</span>
          <span className="ticker-symbol">✳</span>
          <span>STAY HUMAN</span>
          <span className="ticker-symbol">✳</span>
          <span>CURIOUS BY DEFAULT</span>
          <span className="ticker-symbol">✳</span>
          <span>MAKE IT USEFUL</span>
          <span className="ticker-symbol">✳</span>
          <span>STAY HUMAN</span>
        </div>
      </div>

      <section id="work" className="content-section work-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Selected work</p>
            <h2>一些认真做过的事。</h2>
          </div>
          <p className="section-aside">
            不追求把所有经历都摆出来，
            <br />
            只留下能代表工作方式的片段。
          </p>
        </div>

        <div className="project-list">
          {projects.map((project) => (
            <article className="project-card" key={project.number}>
              <div className="project-number">{project.number}</div>
              <div className="project-main">
                <p className="project-type">{project.type}</p>
                <h3>{project.title}</h3>
                <p className="project-description">{project.description}</p>
                <div className="tag-list" aria-label="项目关键词">
                  {project.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <span className="project-arrow" aria-hidden="true">
                ↗
              </span>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className="content-section about-section">
        <div className="about-intro">
          <p className="section-kicker">A little about me</p>
          <h2>我相信，好的工作会让人更有力量。</h2>
        </div>
        <div className="about-copy">
          <p>
            我喜欢从一个具体的问题出发，和不同背景的人一起把它拆开、重组，
            最后做出可以被真实使用的东西。工作之外，我会读书、散步，
            偶尔做一些没有明确目的的小实验。
          </p>
          <p>
            如果你正在思考一个产品、一段合作，或者只是想聊聊最近发现的好东西，
            欢迎来信。
          </p>
        </div>
        <div className="principle-list">
          {principles.map(([number, title, description]) => (
            <div className="principle" key={number}>
              <span className="principle-number">{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="contact-section">
        <div>
          <p className="section-kicker">Have something in mind?</p>
          <h2>那就从一句你好开始。</h2>
        </div>
        <a className="contact-link" href="mailto:hello@example.com">
          <span>hello@example.com</span>
          <span aria-hidden="true">↗</span>
        </a>
      </section>

      <footer className="site-footer">
        <span>© 2025 Lero β. Made with care.</span>
        <div className="footer-links">
          <a href="https://github.com/" target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
          <a href="#top">回到顶部 ↑</a>
        </div>
      </footer>
    </main>
  );
}

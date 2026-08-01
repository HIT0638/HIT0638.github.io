import Link from "next/link";
import { collections, type Collection } from "./data";

function CollectionStats({ collection }: { collection: Collection }) {
  return (
    <div className="study-prototype-stats">
      {collection.stats.map((stat) => (
        <span key={stat}>{stat}</span>
      ))}
    </div>
  );
}

function CollectionShelf() {
  return (
    <div className="study-prototype-shelf">
      {collections.map((collection) => (
        <Link
          className="study-prototype-shelf-card"
          href={`/prototype/study-collections/${collection.slug}`}
          key={collection.slug}
        >
          <div className="study-prototype-shelf-card-topline">
            <span>{collection.code}</span>
            <span>OPEN COLLECTION ↗</span>
          </div>
          <h2>{collection.title}</h2>
          <p>{collection.subtitle}</p>
          <CollectionStats collection={collection} />
          <ol>
            {collection.modules.slice(0, 3).map((module) => (
              <li key={module.code}>
                <span>{module.code}</span>
                <span>{module.title}</span>
              </li>
            ))}
          </ol>
        </Link>
      ))}
    </div>
  );
}

export default function StudyCollectionsPrototype() {
  return (
    <main className="site-shell study-prototype-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="返回首页">
          <span className="brand-mark brand-mark-beta">
            L<span className="brand-beta">β</span>
          </span>
          <span className="brand-name">Lero β</span>
        </Link>
        <span className="header-context">collections / archive</span>
      </header>

      <section className="study-prototype-intro" aria-labelledby="study-prototype-title">
        <div>
          <p className="study-prototype-label">STUDY COLLECTIONS</p>
          <h1 id="study-prototype-title">专题</h1>
          <p>
            这里收录我整理的技术专题。把零散的问题、概念和代码，放回一条可以继续
            阅读的路径里。
          </p>
        </div>
      </section>

      <section className="study-prototype-stage" aria-label="专题卡片">
        <CollectionShelf />
      </section>

      <footer className="site-footer study-prototype-footer">
        <span>COLLECTIONS · Markdown source connected</span>
        <Link href="/">← return to archive</Link>
      </footer>

    </main>
  );
}

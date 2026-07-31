import Link from "next/link";
import { collections, type Collection } from "./data";

type Variant = "catalog" | "workspace" | "shelf";

const variants: Array<{ id: Variant; label: string; note: string }> = [
  { id: "catalog", label: "文字目录", note: "最接近当前 Lero β" },
  { id: "workspace", label: "阅读工作台", note: "专题导航 + 当前摘要" },
  { id: "shelf", label: "专题卡片", note: "更像独立资料库" },
];

function isVariant(value: string | undefined): value is Variant {
  return value === "catalog" || value === "workspace" || value === "shelf";
}

function CollectionStats({ collection }: { collection: Collection }) {
  return (
    <div className="study-prototype-stats">
      {collection.stats.map((stat) => (
        <span key={stat}>{stat}</span>
      ))}
    </div>
  );
}

function ModuleRows({ collection }: { collection: Collection }) {
  return (
    <div className="study-prototype-module-list">
      {collection.modules.map((module) => (
        <a
          className="study-prototype-module-row"
          href={`/prototype/study-collections/${collection.slug}/${module.path.replace(
            /\.md$/,
            "",
          )}`}
          key={module.code}
        >
          <span className="study-prototype-module-code">{module.code}</span>
          <span className="study-prototype-module-title">{module.title}</span>
          <span className="study-prototype-module-detail">{module.detail}</span>
          <span className="study-prototype-module-arrow" aria-hidden="true">
            ↗
          </span>
        </a>
      ))}
    </div>
  );
}

function CatalogVariant() {
  return (
    <div className="study-prototype-catalog">
      {collections.map((collection) => (
        <section
          className="study-prototype-catalog-section"
          id={`prototype-${collection.slug}`}
          key={collection.slug}
        >
          <div className="study-prototype-section-heading">
            <span className="study-prototype-index">{collection.code}</span>
            <div>
              <p className="study-prototype-label">STUDY COLLECTION</p>
              <h2>{collection.title}</h2>
              <p className="study-prototype-subtitle">{collection.subtitle}</p>
            </div>
            <CollectionStats collection={collection} />
          </div>
          <p className="study-prototype-summary">{collection.summary}</p>
          <ModuleRows collection={collection} />
        </section>
      ))}
    </div>
  );
}

function WorkspaceVariant() {
  const collection = collections[0];

  return (
    <div className="study-prototype-workspace">
      <aside className="study-prototype-collection-nav" aria-label="专题导航">
        <p className="study-prototype-label">COLLECTIONS</p>
        {collections.map((item) => (
          <a
            className={`study-prototype-collection-link${
              item.slug === collection.slug ? " is-active" : ""
            }`}
            href={`#prototype-${item.slug}`}
            key={item.slug}
          >
            <span>{item.code}</span>
            <strong>{item.title}</strong>
            <small>{item.stats[0]}</small>
          </a>
        ))}
        <p className="study-prototype-nav-note">
          这里可以放专题之间的切换；课程内部仍沿用文章页的目录。
        </p>
      </aside>

      <section className="study-prototype-workspace-main" id="prototype-flink-interview">
        <div className="study-prototype-workspace-heading">
          <p className="study-prototype-label">{collection.code} / CURRENT COLLECTION</p>
          <h2>{collection.title}</h2>
          <p>{collection.summary}</p>
          <CollectionStats collection={collection} />
        </div>
        <ModuleRows collection={collection} />
      </section>
    </div>
  );
}

function ShelfVariant() {
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

export default async function StudyCollectionsPrototype({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  const query = await searchParams;
  const variant = isVariant(query.variant) ? query.variant : "shelf";
  const variantMeta = variants.find((item) => item.id === variant) ?? variants[0];

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
            把原有的 MkDocs 学习资料，放进 Lero β 的文本系统里。这里先收录两套
            面试专题，保留原始 Markdown 与代码的阅读路径。
          </p>
        </div>
        <div className="study-prototype-question">
          <span>QUESTION</span>
          <strong>这些内容应该像文章，还是像一套资料？</strong>
          <small>当前变体：{variantMeta.note}</small>
        </div>
      </section>

      <section className="study-prototype-stage" aria-label={`${variantMeta.label}原型`}>
        {variant === "catalog" ? <CatalogVariant /> : null}
        {variant === "workspace" ? <WorkspaceVariant /> : null}
        {variant === "shelf" ? <ShelfVariant /> : null}
      </section>

      <footer className="site-footer study-prototype-footer">
        <span>COLLECTIONS · Markdown source connected</span>
        <Link href="/">← return to archive</Link>
      </footer>

      <nav className="study-prototype-switcher" aria-label="切换专题原型">
        <span>VIEW</span>
        {variants.map((item) => (
          <a
            className={item.id === variant ? "is-active" : ""}
            href={`?variant=${item.id}`}
            key={item.id}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </main>
  );
}

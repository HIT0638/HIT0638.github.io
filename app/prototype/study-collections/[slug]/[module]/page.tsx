import { notFound } from "next/navigation";
import { getCollectionDocument } from "../../content";
import { collections, getCollection } from "../../data";
import { CollectionReadingPage } from "../../reading-page";

function collectionPages(slug: string) {
  const collection = getCollection(slug);
  if (!collection) return [];

  return [...collection.supportPages, ...collection.modules];
}

export function generateStaticParams() {
  return collections.flatMap((collection) =>
    collectionPages(collection.slug).map((page) => ({
      slug: collection.slug,
      module: page.path.replace(/\.md$/, ""),
    })),
  );
}

export default async function StudyCollectionDocumentPage({
  params,
}: {
  params: Promise<{ slug: string; module: string }>;
}) {
  const { slug, module } = await params;
  const collection = getCollection(slug);
  const page = collectionPages(slug).find(
    (item) => item.path.replace(/\.md$/, "") === module,
  );
  const document = page ? getCollectionDocument(slug, page.path) : null;

  if (!collection || !page || !document) notFound();

  return (
    <CollectionReadingPage
      collection={collection}
      currentPath={page.path}
      document={document}
      pageKind={page.code === "DOC" ? "support" : "module"}
    />
  );
}

import { notFound } from "next/navigation";
import { getCollectionDocument } from "../../../content";
import { collections, getCollection } from "../../../data";
import { CollectionReadingPage } from "../../../reading-page";

export function generateStaticParams() {
  return collections.flatMap((collection) =>
    collection.references.map((reference) => ({
      slug: collection.slug,
      page: reference.path.replace(/^reference\//, "").replace(/\.md$/, ""),
    })),
  );
}

export default async function StudyCollectionReferencePage({
  params,
}: {
  params: Promise<{ slug: string; page: string }>;
}) {
  const { slug, page } = await params;
  const collection = getCollection(slug);
  const reference = collection?.references.find(
    (item) => item.path === `reference/${page}.md`,
  );
  const document = reference
    ? getCollectionDocument(slug, reference.path)
    : null;

  if (!collection || !reference || !document) notFound();

  return (
    <CollectionReadingPage
      collection={collection}
      currentPath={reference.path}
      document={document}
      pageKind="reference"
    />
  );
}

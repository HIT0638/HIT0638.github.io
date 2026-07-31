import { notFound } from "next/navigation";
import {
  getCollectionDocument,
} from "../content";
import { collections, getCollection } from "../data";
import { CollectionReadingPage } from "../reading-page";

export function generateStaticParams() {
  return collections.map((collection) => ({ slug: collection.slug }));
}

export default async function StudyCollectionPrototypePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = getCollection(slug);
  const document = getCollectionDocument(slug, "index.md");

  if (!collection || !document) notFound();

  return (
    <CollectionReadingPage
      collection={collection}
      currentPath="index.md"
      document={document}
      pageKind="overview"
    />
  );
}

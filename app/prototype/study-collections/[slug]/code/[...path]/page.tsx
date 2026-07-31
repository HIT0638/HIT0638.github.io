import { notFound } from "next/navigation";
import { getCollectionCode, getCollectionCodePaths } from "../../../content";
import { collections, getCollection } from "../../../data";
import { CollectionCodePage } from "../../../reading-page";

export function generateStaticParams() {
  return collections.flatMap((collection) =>
    getCollectionCodePaths(collection.slug).map((sourcePath) => ({
      slug: collection.slug,
      path: sourcePath.split("/"),
    })),
  );
}

export default async function StudyCollectionCodePage({
  params,
}: {
  params: Promise<{ slug: string; path: string[] }>;
}) {
  const { slug, path } = await params;
  const collection = getCollection(slug);
  const codeFile = getCollectionCode(slug, path.join("/"));

  if (!collection || !codeFile) notFound();

  return <CollectionCodePage collection={collection} codeFile={codeFile} />;
}

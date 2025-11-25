import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { allDocs } from "content-collections";

import { DocLayout } from "./-components";

export const Route = createFileRoute("/_view/docs/$")({
  component: Component,
  loader: async ({ params }) => {
    const splat = params._splat || "";
    let doc = allDocs.find((doc) => doc.slug === splat);

    if (!doc) {
      doc = allDocs.find((doc) => doc.slug === `${splat}/index`);
    }

    if (!doc) {
      const pathParts = splat.split("/");
      const firstPart = pathParts[0];
      const sectionName =
        firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
      const docsInSection = allDocs
        .filter((d) => d.section === sectionName && !d.isIndex)
        .sort((a, b) => a.order - b.order);

      if (docsInSection.length > 0) {
        throw redirect({
          to: "/docs/$",
          params: { _splat: docsInSection[0].slug },
        });
      }

      throw notFound();
    }

    return { doc };
  },
  head: ({ loaderData }) => {
    const { doc } = loaderData!;
    const url = `https://hyprnote.com/docs/${doc.slug}`;
    const ogImageUrl = `https://hyprnote.com/og?type=docs&title=${encodeURIComponent(doc.title)}&section=${encodeURIComponent(doc.section)}${doc.summary ? `&description=${encodeURIComponent(doc.summary)}` : ""}`;

    return {
      meta: [
        { title: doc.title },
        { name: "description", content: doc.summary || doc.title },
        { property: "og:title", content: doc.title },
        { property: "og:description", content: doc.summary || doc.title },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: ogImageUrl },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: doc.title },
        { name: "twitter:description", content: doc.summary || doc.title },
        { name: "twitter:image", content: ogImageUrl },
      ],
    };
  },
});

function Component() {
  const { doc } = Route.useLoaderData();

  return <DocLayout doc={doc} showSectionTitle={true} />;
}

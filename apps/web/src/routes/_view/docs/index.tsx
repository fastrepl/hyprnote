import { createFileRoute, notFound } from "@tanstack/react-router";
import { allDocs } from "content-collections";

import { DocLayout } from "./-components";

export const Route = createFileRoute("/_view/docs/")({
  component: Component,
  loader: async () => {
    const doc = allDocs.find((doc) => doc.slug === "index");
    if (!doc) {
      throw notFound();
    }

    return { doc };
  },
  head: ({ loaderData }) => {
    const { doc } = loaderData!;
    const url = "https://hyprnote.com/docs";

    return {
      meta: [
        { title: doc.title },
        { name: "description", content: doc.summary || doc.title },
        { property: "og:title", content: doc.title },
        { property: "og:description", content: doc.summary || doc.title },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: doc.title },
        { name: "twitter:description", content: doc.summary || doc.title },
      ],
    };
  },
});

function Component() {
  const { doc } = Route.useLoaderData();

  return <DocLayout doc={doc} showSectionTitle={false} />;
}

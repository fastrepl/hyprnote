import { MDXContent } from "@content-collections/mdx/react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { allPosts } from "content-collections";

export const Route = createFileRoute("/_view/changelog/$slug")({
  component: Component,
  loader: async ({ params }) => {
    const post = allPosts.find((post) => post.slug === params.slug);
    if (!post) {
      throw notFound();
    }

    return { post };
  },
});

function Component() {
  const { post } = Route.useLoaderData();
  return (
    <div>
      <MDXContent code={post.mdx} />
    </div>
  );
}

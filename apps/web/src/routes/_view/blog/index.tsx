import { createFileRoute, Link } from "@tanstack/react-router";

import { allPosts, type Post } from "content-collections";

export const Route = createFileRoute("/_view/blog/")({
  component: Component,
});

function Component() {
  return (
    <ul>
      {allPosts.map((post) => <PostComponent key={post._meta.filePath} post={post} />)}
    </ul>
  );
}

function PostComponent({ post }: { post: Post }) {
  return (
    <li>
      <Link to="/blog/$slug" params={{ slug: post.slug }}>
        {post.title}
      </Link>
    </li>
  );
}

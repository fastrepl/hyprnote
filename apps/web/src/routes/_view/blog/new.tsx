import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { BlogEditor } from "@/components/blog-editor";
import { checkBlogEditorAccess } from "@/functions/blog";

export const Route = createFileRoute("/_view/blog/new")({
  component: Component,
  head: () => ({
    meta: [{ title: "New Article - Hyprnote Blog" }],
  }),
});

function Component() {
  const navigate = useNavigate();

  const { data: access, isLoading } = useQuery({
    queryKey: ["blog-editor-access"],
    queryFn: () => checkBlogEditorAccess(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-500">Loading...</div>
      </div>
    );
  }

  if (!access?.allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-stone-600 mb-4">
            Access Denied
          </h1>
          <p className="text-neutral-500 mb-6">
            {access?.reason === "not_authenticated"
              ? "Please sign in to access the blog editor."
              : "You don't have permission to access the blog editor."}
          </p>
          <button
            onClick={() => navigate({ to: "/blog" })}
            className="px-4 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition-colors"
          >
            Back to Blog
          </button>
        </div>
      </div>
    );
  }

  return <BlogEditor mode="new" />;
}

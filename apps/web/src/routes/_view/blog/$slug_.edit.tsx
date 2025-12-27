import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { BlogEditor } from "@/components/blog-editor";
import { checkBlogEditorAccess, getArticleForEdit } from "@/functions/blog";

export const Route = createFileRoute("/_view/blog/$slug_/edit")({
  component: Component,
  head: ({ params }) => ({
    meta: [{ title: `Edit ${params.slug} - Hyprnote Blog` }],
  }),
});

function Component() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();

  const { data: access, isLoading: accessLoading } = useQuery({
    queryKey: ["blog-editor-access"],
    queryFn: () => checkBlogEditorAccess(),
  });

  const { data: articleData, isLoading: articleLoading } = useQuery({
    queryKey: ["article-edit", slug],
    queryFn: () => getArticleForEdit({ data: { slug } }),
    enabled: access?.allowed === true,
  });

  if (accessLoading || articleLoading) {
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

  if (articleData && "error" in articleData && articleData.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-stone-600 mb-4">
            Article Not Found
          </h1>
          <p className="text-neutral-500 mb-6">{articleData.message}</p>
          <button
            onClick={() => navigate({ to: "/blog/new" })}
            className="px-4 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition-colors"
          >
            Create New Article
          </button>
        </div>
      </div>
    );
  }

  if (!articleData || !("article" in articleData)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-500">Loading article...</div>
      </div>
    );
  }

  return <BlogEditor mode="edit" initialData={articleData.article} />;
}

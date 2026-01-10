import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-6">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <a
          href="/admin/media"
          className="block p-6 bg-white rounded-lg border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all"
        >
          <h2 className="text-lg font-medium text-neutral-900 mb-2">
            Media Library
          </h2>
          <p className="text-sm text-neutral-500">
            Upload, organize, and manage media assets for blog posts and
            content.
          </p>
        </a>

        <div className="block p-6 bg-white rounded-lg border border-neutral-200 opacity-50">
          <h2 className="text-lg font-medium text-neutral-900 mb-2">
            Import from Google Docs
          </h2>
          <p className="text-sm text-neutral-500">
            Import blog posts from Google Docs with automatic markdown
            conversion.
          </p>
          <span className="inline-block mt-2 text-xs text-neutral-400">
            Coming soon
          </span>
        </div>

        <div className="block p-6 bg-white rounded-lg border border-neutral-200 opacity-50">
          <h2 className="text-lg font-medium text-neutral-900 mb-2">
            Blog Posts
          </h2>
          <p className="text-sm text-neutral-500">
            View and manage all published and draft blog posts.
          </p>
          <span className="inline-block mt-2 text-xs text-neutral-400">
            Coming soon
          </span>
        </div>
      </div>
    </div>
  );
}

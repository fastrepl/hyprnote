import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/media/")({
  component: MediaLibrary,
});

function MediaLibrary() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Media Library
        </h1>
      </div>

      <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
        <p className="text-neutral-500">
          Media library functionality coming in the next PR.
        </p>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import EditorArea from "@/components/note/editor-area";

export const Route = createFileRoute("/app/note/$id/sub")({
  component: Component,
});

function Component() {
  return (
    <main className="flex h-full overflow-hidden bg-white">
      <div className="h-full flex-1">
        <EditorArea />
      </div>
    </main>
  );
}

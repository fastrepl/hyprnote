import { createFileRoute, useParams } from "@tanstack/react-router";

import EditorArea from "@/components/note/editor-area";

const PATH = "/app/note/$id/sub";
export const Route = createFileRoute("/app/note/$id/sub")({
  component: Component,
});

function Component() {
  const { id } = useParams({ from: PATH });

  return (
    <main className="flex h-full overflow-hidden bg-white">
      <div className="h-full flex-1">
        <EditorArea editable={false} sessionId={id} />
      </div>
    </main>
  );
}

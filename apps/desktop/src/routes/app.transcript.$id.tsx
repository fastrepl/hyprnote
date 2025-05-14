import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";

import { commands as dbCommands } from "@hypr/plugin-db";
import TranscriptEditor from "@hypr/tiptap/transcript";

export const Route = createFileRoute("/app/transcript/$id")({
  component: Component,
  loader: async ({ params: { id }, context: { onboardingSessionId } }) => {
    const timeline = onboardingSessionId
      ? await dbCommands.getTimelineViewOnboarding()
      : await dbCommands.getTimelineView(id);

    return { timeline };
  },
});

function Component() {
  const { timeline } = Route.useLoaderData();
  const editorRef = useRef(null);

  const content = {
    type: "doc",
    content: [
      {
        type: "speaker",
        attrs: { label: "" },
        content: (timeline?.items || []).flatMap((item) => item.text.split(" ")).filter(Boolean).map((word) => ({
          type: "word",
          content: [{ type: "text", text: word }],
        })),
      },
    ],
  };

  return (
    <div className="p-6 flex-1 flex flex-col overflow-hidden">
      <div className="h-full overflow-auto">
        <TranscriptEditor
          ref={editorRef}
          initialContent={content}
        />
      </div>
    </div>
  );
}

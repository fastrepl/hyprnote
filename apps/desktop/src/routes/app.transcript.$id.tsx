import { createFileRoute } from "@tanstack/react-router";

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
    <div className="p-12">
      <TranscriptEditor initialContent={content} />
    </div>
  );
}

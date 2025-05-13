import { createFileRoute } from "@tanstack/react-router";
import { PencilIcon } from "lucide-react";
import { useRef } from "react";

import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import TranscriptEditor from "@hypr/tiptap/transcript";
import { Button } from "@hypr/ui/components/ui/button";

export const Route = createFileRoute("/app/transcript/$id")({
  component: Component,
  loader: async ({ params: { id }, context: { onboardingSessionId } }) => {
    const session = await dbCommands.getSession({ id }).then((v) => v!);
    const timeline = onboardingSessionId
      ? await dbCommands.getTimelineViewOnboarding()
      : await dbCommands.getTimelineView(id);

    return { session, timeline };
  },
});

function Component() {
  const { session, timeline } = Route.useLoaderData();
  const editorRef = useRef(null);

  const handleSave = () => {
    windowsCommands.windowDestroy({ type: "transcript", value: session.id });
  };

  const handleCancel = () => {
    windowsCommands.windowDestroy({ type: "transcript", value: session.id });
  };

  const content = {
    type: "doc",
    content: [
      {
        type: "speaker",
        attrs: { label: "Unknown" },
        content: [
          {
            type: "speakerLabel",
            content: [{ type: "text", text: "Unknown" }],
          },
          {
            type: "speakerContent",
            content: (timeline?.items || []).flatMap((item) =>
              item.text.split(" ").filter(Boolean).map((word) => ({
                type: "word",
                content: [{ type: "text", text: word }],
              }))
            ),
          },
        ],
      },
    ],
  };

  return (
    <div className="h-full flex flex-col">
      <div className="absolute top-3 left-0 right-0 flex justify-center items-center h-4 px-4">
        <h1 className="text-md font-light flex items-center gap-2">
          <PencilIcon className="w-3 h-3" />
          <span>{session.title}</span>
        </h1>
        <div className="absolute right-3 flex items-center gap-2">
          <Button
            onClick={handleCancel}
            variant="ghost"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            size="sm"
          >
            Save
          </Button>
        </div>
      </div>
      <div className="p-6 pt-10 flex-1 flex flex-col overflow-hidden">
        <div className="h-full overflow-auto">
          <TranscriptEditor
            ref={editorRef}
            initialContent={content}
          />
        </div>
      </div>
    </div>
  );
}

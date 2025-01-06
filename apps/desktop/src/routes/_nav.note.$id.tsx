import { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import clsx from "clsx";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";

import { generateJSON, JSONContent } from "@tiptap/react";

import { Textarea } from "@hypr/ui/components/ui/textarea";
import { ScrollArea } from "@hypr/ui/components/ui/scroll-area";
import { Button } from "@hypr/ui/components/ui/button";

import { useUI } from "@/stores/ui";
import { useEnhance } from "@/utils/enhance";

import Editor, { extensions } from "@/components/editor";
import ParticipantsSelector from "@/components/participants-selector";
import SelectedEvent from "@/components/selected-event";

const queryOptions = (id: string) => ({
  queryKey: ["note", { id }],
  queryFn: () => {
    return {
      noteHtml:
        // <hyprcharge text='Analyzing transcript with your notes...'></hyprcharge><
        "<p>Hello World!</p>",
    };
  },
});

export const Route = createFileRoute("/_nav/note/$id")({
  component: Component,
  loader: ({ context: { queryClient }, params: { id } }) => {
    return queryClient.ensureQueryData(queryOptions(id));
  },
});

function Component() {
  const { isPanelOpen } = useUI();

  return isPanelOpen ? (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel>
        <LeftPanel />
      </ResizablePanel>
      <ResizableHandle withHandle className="w-1 bg-secondary" />
      <ResizablePanel defaultSize={25} minSize={25} maxSize={40}>
        <RightPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  ) : (
    <LeftPanel />
  );
}

function LeftPanel() {
  const { id } = Route.useParams();

  const {
    data: { noteHtml },
  } = useSuspenseQuery(queryOptions(id));

  const [editorContent, setEditorContent] = useState<JSONContent>(
    generateJSON(noteHtml, extensions),
  );

  const handleChange = useCallback((content: JSONContent) => {
    setEditorContent(content);
  }, []);

  const { data, isLoading, stop, submit } = useEnhance({
    baseUrl: "http://127.0.0.1:8000",
    apiKey: "TODO",
    editor: editorContent,
  });

  useEffect(() => {
    if (data) {
      setEditorContent(data);
    }
  }, [data]);

  return (
    <div className="flex flex-col p-8">
      <div className="flex flex-row items-center justify-between">
        <input
          type="text"
          placeholder="Untitled meeting"
          className={clsx([
            "border-none bg-transparent text-2xl font-bold caret-gray-300 focus:outline-none",
          ])}
        />
        <div>
          {isLoading ? (
            <Button variant="outline" onClick={() => stop()}>
              Stop
            </Button>
          ) : (
            <Button variant="outline" onClick={() => submit()}>
              Enhance
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-row items-center gap-2 p-1">
        <SelectedEvent />
        <div className="w-[200px]">
          <ParticipantsSelector />
        </div>
      </div>

      <Editor handleChange={handleChange} content={editorContent} />
    </div>
  );
}

function RightPanel() {
  return (
    <div className="flex h-full flex-col justify-end">
      <ScrollArea className="h-full">
        <div className="flex flex-col p-4">
          <div className="mb-4 flex-1 overflow-y-auto">
            <h2 className="mb-2 text-lg font-semibold">Transcript</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">John Doe</div>
                <div className="text-sm text-muted-foreground">
                  Thanks everyone for joining today's product review meeting.
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Sarah Chen</div>
                <div className="text-sm text-muted-foreground">
                  I've prepared the Q3 metrics for us to review. We're seeing a
                  15% increase in user engagement compared to last quarter.
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Mike Johnson</div>
                <div className="text-sm text-muted-foreground">
                  That's great news! What do you think contributed to this
                  increase?
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Sarah Chen</div>
                <div className="text-sm text-muted-foreground">
                  The new onboarding flow we implemented seems to be the main
                  factor. Users are completing the setup process 30% faster now.
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Emma Williams</div>
                <div className="text-sm text-muted-foreground">
                  We should also consider the impact of the new feature rollout
                  last month. The feedback has been overwhelmingly positive.
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="mb-10 p-2">
        <Textarea
          className="resize-none"
          placeholder="Ask about this meeting..."
        />
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";

import { generateJSON, JSONContent } from "@tiptap/react";

import Editor, { extensions } from "../components/editor";
import { useUI } from "../stores/ui";
import { useEnhance } from "../utils/enhance";
import ParticipantsSelector from "@/components/participants-selector";

const queryOptions = (id: string) => ({
  queryKey: ["note", { id }],
  queryFn: () => {
    return {
      noteHtml:
        "<hyprcharge text='Analyzing transcript with your notes...'></hyprcharge><p>Hello World!</p>",
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
  return (
    <div>
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel>
          <LeftPanel />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={30} minSize={30} maxSize={60}>
          <RightPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function LeftPanel() {
  const { id } = Route.useParams();

  const {
    data: { noteHtml },
  } = useSuspenseQuery(queryOptions(id));

  const { isPanelOpen } = useUI();
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
    <>
      {isLoading ? (
        <button type="button" onClick={() => stop()}>
          Stop
        </button>
      ) : (
        <button type="button" onClick={() => submit()}>
          Enhance
        </button>
      )}

      <ParticipantsSelector />

      <Editor handleChange={handleChange} content={editorContent} />
    </>
  );
}

function RightPanel() {
  return <div>right panel</div>;
}

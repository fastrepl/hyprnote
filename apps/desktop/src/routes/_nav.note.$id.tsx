import { useState, useEffect, useCallback } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AlignLeft, Ear, EarOff, Zap } from "lucide-react";
import clsx from "clsx";

import { generateJSON, JSONContent } from "@tiptap/react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";

import { Textarea } from "@hypr/ui/components/ui/textarea";
import { ScrollArea } from "@hypr/ui/components/ui/scroll-area";

import Editor, { extensions } from "@/components/editor";
import ParticipantsSelector from "@/components/participants-selector";
import SelectedEvent from "@/components/selected-event";

import { useUI } from "@/stores/ui";
// import { useEnhance } from "@/utils/enhance";
import { commands, Transcript } from "@/types/tauri";
import AudioIndicator from "@/components/audio-indicator";

const queryOptions = (id: string) => ({
  queryKey: ["note", { id }],
  queryFn: async () => {
    const session = await commands.dbGetSession(id);
    if (!session) {
      throw redirect({ to: "/" });
    }

    return session;
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
        <RightPanel transcript={t} />
      </ResizablePanel>
    </ResizablePanelGroup>
  ) : (
    <LeftPanel />
  );
}

function LeftPanel() {
  const { id } = Route.useParams();

  const { data: session } = useSuspenseQuery(queryOptions(id));

  const [title, setTitle] = useState(session.title);

  const [editorContent, setEditorContent] = useState<JSONContent>(
    generateJSON(session.raw_memo_html, extensions),
  );

  const handleChange = useCallback((content: JSONContent) => {
    setEditorContent(content);
  }, []);

  // const { data, isLoading, stop, submit } = useEnhance({
  //   baseUrl: "http://127.0.0.1:8000",
  //   apiKey: "TODO",
  //   editor: editorContent,
  // });

  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (editorContent) {
      setEditorContent(editorContent);
    }
  }, [editorContent]);

  return (
    <div className="flex h-full flex-col p-8">
      <div className="flex flex-row items-center justify-between">
        <input
          type="text"
          onChange={(e) => setTitle(e.target.value)}
          value={title}
          placeholder="Untitled meeting"
          className={clsx([
            "border-none bg-transparent text-2xl font-bold caret-gray-300 focus:outline-none",
          ])}
        />
        <button
          className={clsx([
            "relative rounded-lg border border-border p-2",
            listening ? "text-foreground/30" : "text-foreground/50",
            listening && "border-primary/30",
          ])}
          onClick={() => setListening(!listening)}
        >
          {listening ? <Ear size={20} /> : <EarOff size={20} />}
          {listening && (
            <div className="absolute inset-0 flex items-center justify-center">
              <AudioIndicator amplitude={0.5} />
            </div>
          )}
        </button>
      </div>

      <div className="flex flex-row items-center gap-2 py-1">
        <SelectedEvent />
        <div className="w-[200px]">
          <ParticipantsSelector />
        </div>
      </div>

      <div className="flex-1 mt-6">
        <Editor handleChange={handleChange} content={editorContent} />
      </div>

      <div className="mb-8 flex justify-center">
        <EnhanceControls />
      </div>
    </div>
  );
}

const t: Transcript = {
  blocks: [
    {
      timestamp: "2024-01-01 10:00:00",
      text: "Hello, how are you?",
      speaker: "John Doe",
    },
    {
      timestamp: "2024-01-01 10:00:00",
      text: "I'm fine, thank you!",
      speaker: "Jane Doe",
    },
  ],
  speakers: [],
};

interface RightPanelProps {
  transcript: Transcript;
}

function RightPanel({ transcript }: RightPanelProps) {
  return (
    <div className="flex h-full flex-col justify-end">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 text-sm">
          {transcript.blocks.map((message, index) => (
            <div className="mb-4" key={index}>
              <div className="rounded-lg bg-muted px-3 py-1 text-muted-foreground">
                {message.text}
              </div>
            </div>
          ))}
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

function EnhanceControls() {
  const [left, setLeft] = useState(true);

  return (
    <div className="flex w-fit flex-row items-center">
      <button
        onClick={() => setLeft(!left)}
        className={clsx([
          "rounded-l-xl border border-r-0 border-border px-3 py-2",
          left ? "bg-primary/20" : "bg-background",
          left ? "text-primary" : "text-muted-foreground",
        ])}
      >
        <AlignLeft size={20} />
      </button>
      <button
        onClick={() => setLeft(!left)}
        className={clsx([
          "rounded-r-xl border border-l-0 border-border px-3 py-2",
          !left ? "bg-primary/20" : "bg-background",
          !left ? "text-primary" : "text-muted-foreground",
        ])}
      >
        <Zap
          size={20}
          className={clsx([
            !left ? "fill-primary/60" : "fill-background",
          ])}
        />
      </button>
    </div>
  );
}

import { useState, useCallback } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { AlignLeft, Ear, EarOff, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import { ScrollArea } from "@hypr/ui/components/ui/scroll-area";

import Editor from "@hypr/tiptap/editor";

import ParticipantsSelector from "@/components/participants-selector";
import SelectedEvent from "@/components/selected-event";
import AudioIndicator from "@/components/audio-indicator";

import { useUI } from "@/stores/ui";
import { useEnhance } from "@/utils/enhance";
import {
  commands,
  type ConfigDataGeneral,
  type ConfigDataProfile,
} from "@/types/tauri";
import { SessionProvider, useSession } from "@/contexts";

export const Route = createFileRoute("/_nav/note/$id")({
  component: Component,
  loader: ({ context: { queryClient }, params: { id } }) => {
    return queryClient.fetchQuery({
      queryKey: ["note", { id }],
      queryFn: async () => {
        const [session, profile, general, builtinTemplates, customTemplates] =
          await Promise.all([
            commands.dbGetSession(id),
            commands.dbGetConfig("profile"),
            commands.dbGetConfig("general"),
            commands.listBuiltinTemplates(),
            commands.dbListTemplates(),
          ]);
        if (!session) {
          throw redirect({ to: "/" });
        }

        return {
          session,
          profile: profile?.data as ConfigDataProfile,
          general: general?.data as ConfigDataGeneral,
          templates: [...builtinTemplates, ...customTemplates],
        };
      },
    });
  },
});

function Component() {
  const { isPanelOpen } = useUI();
  const { session } = Route.useLoaderData();

  return (
    <SessionProvider session={session}>
      {isPanelOpen ? (
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
      )}
    </SessionProvider>
  );
}

function LeftPanel() {
  const { templates, profile, general } = Route.useLoaderData();
  const { session, listening, start, pause } = useSession((s) => ({
    session: s.session,
    listening: s.listening,
    start: s.start,
    pause: s.pause,
  }));

  const [showRaw, setShowRaw] = useState(true);
  const [title, setTitle] = useState(session.title);

  const [editorContent, setEditorContent] = useState<string>(
    session.raw_memo_html,
  );

  const handleChange = useCallback((content: string) => {
    setEditorContent(content);
  }, []);

  const enhance = useEnhance({
    template: templates[0],
    editor: session.raw_memo_html,
    transcript: session.transcript!,
    config_general: general ?? {
      autostart: false,
      notifications: false,
      language: "En",
      context: "TODO",
    },
    config_profile: profile ?? {
      full_name: "TODO",
      job_title: "TODO",
      company_name: "TODO",
      company_description: "TODO",
      linkedin_username: "TODO",
    },
  });

  return (
    <div className="flex h-full flex-col p-8">
      <button onClick={() => enhance.submit()}>Enhance</button>

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
          onClick={() => {
            if (listening) {
              pause();
            } else {
              start();
            }
          }}
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
          <ParticipantsSelector
            options={[]}
            selected={[]}
            handleSelect={() => {}}
          />
        </div>
      </div>

      <div
        className={clsx([
          "mt-6 flex flex-1 flex-col",
          enhance.isLoading ? "tiptap-animate" : "",
        ])}
      >
        <Editor handleChange={handleChange} content={editorContent} />
      </div>

      <AnimatePresence>
        {!listening && (
          <motion.div
            className="mb-8 flex justify-center"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <EnhanceControls showRaw={showRaw} setShowRaw={setShowRaw} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RightPanel() {
  const { listening, session } = useSession((s) => ({
    listening: s.listening,
    session: s.session,
  }));

  return (
    <div className="flex h-full flex-col justify-end">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 text-sm">
          {session.transcript?.blocks.map((message, index) => (
            <div className="mb-4" key={index}>
              <div className="rounded-lg bg-muted px-3 py-1 text-muted-foreground">
                {message.text}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {!listening && (
        <div className="mb-10 p-2">
          <Textarea
            className="resize-none"
            placeholder="Ask about this meeting..."
          />
        </div>
      )}
    </div>
  );
}

function EnhanceControls({
  showRaw,
  setShowRaw,
}: {
  showRaw: boolean;
  setShowRaw: (showRaw: boolean) => void;
}) {
  return (
    <div className="flex w-fit flex-row items-center">
      <button
        onClick={() => setShowRaw(!showRaw)}
        className={clsx([
          "h-9 rounded-l-xl border border-r-0 border-border px-3",
          "duration-400 transition-all ease-in-out",
          showRaw ? "bg-primary/20" : "bg-background",
          showRaw ? "text-primary" : "text-muted-foreground",
        ])}
      >
        <AlignLeft size={20} />
      </button>
      <button
        onClick={() => setShowRaw(!showRaw)}
        className={clsx([
          "h-9 rounded-r-xl border border-l-0 border-border px-3",
          "duration-400 transition-all ease-in-out",
          !showRaw ? "bg-primary/20" : "bg-background",
          !showRaw ? "text-primary" : "text-muted-foreground",
        ])}
      >
        <Zap
          size={20}
          className={clsx([
            "transition-[fill] duration-200 ease-in-out",
            !showRaw ? "fill-primary/60" : "fill-background",
          ])}
        />
      </button>
    </div>
  );
}

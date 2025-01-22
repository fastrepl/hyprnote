import { useState, useCallback, useEffect, type ChangeEvent } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";

import NoteEditor from "@hypr/tiptap/editor";
import NoteRenderer from "@hypr/tiptap/renderer";

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
  const { session } = Route.useLoaderData();
  const { isPanelOpen } = useUI();

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

  const store = useSession((s) => ({
    session: s.session,
    listening: s.listening,
    start: s.start,
    pause: s.pause,
    updateTitle: s.updateTitle,
    updateRawNote: s.updateRawNote,
    updateEnhancedNote: s.updateEnhancedNote,
    persistSession: s.persistSession,
  }));

  const [showRaw, setShowRaw] = useState(true);

  const handleChangeNote = useCallback(
    (content: string) => {
      if (showRaw) {
        store.updateRawNote(content);
        store.persistSession();
      } else {
        store.updateEnhancedNote(content);
      }
    },
    [showRaw, store],
  );

  const handleClickListen = useCallback(() => {
    if (store.listening) {
      store.pause();
    } else {
      store.start();
    }
  }, [store]);

  const enhance = useEnhance({
    template: templates[0],
    editor: store.session.raw_memo_html,
    transcript: store.session.transcript ?? { blocks: [] },
    config_general: general,
    config_profile: profile,
  });

  useEffect(() => {
    if (!showRaw && !store.session.enhanced_memo_html) {
      enhance.submit();
    }
  }, [showRaw, store.session.enhanced_memo_html]);

  useEffect(() => {
    if (enhance.data) {
      store.updateEnhancedNote(enhance.data);
    }
  }, [enhance.data]);

  useEffect(() => {
    if (enhance.status === "success" || enhance.status === "loading") {
      store.persistSession();
    }
  }, [enhance.status]);

  const handleTitleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    store.updateTitle(e.target.value);
  }, []);

  return (
    <div className="relative flex h-full flex-col p-8">
      <div className="flex flex-row items-center justify-between">
        <input
          type="text"
          onChange={handleTitleChange}
          value={store.session.title}
          placeholder="Untitled meeting"
          className={clsx([
            "border-none bg-transparent text-2xl font-bold caret-gray-300 focus:outline-none",
          ])}
        />
        <button
          onClick={handleClickListen}
          className={clsx([
            "relative rounded-lg border border-border p-2",
            store.listening ? "text-foreground/30" : "text-foreground/50",
            store.listening && "border-primary/30",
          ])}
        >
          {store.listening ? <Ear size={20} /> : <EarOff size={20} />}
          {store.listening && (
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

      <ScrollArea
        type="auto"
        className={clsx([
          "h-[calc(100vh-240px)] pt-6",
          enhance.status === "loading" ? "tiptap-animate" : "",
        ])}
      >
        {showRaw ? (
          <NoteEditor
            handleChange={handleChangeNote}
            content={store.session.raw_memo_html}
          />
        ) : (
          <NoteRenderer
            handleChange={handleChangeNote}
            content={store.session.enhanced_memo_html ?? ""}
          />
        )}
      </ScrollArea>

      <AnimatePresence>
        {!store.listening && (
          <motion.div
            className="absolute bottom-16 left-1/2 flex -translate-x-1/2 justify-center"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {store.listening ||
            !store.session.transcript?.blocks.length ? null : store.session
                .enhanced_memo_html ? (
              <EnhanceControls showRaw={showRaw} setShowRaw={setShowRaw} />
            ) : (
              <EnhanceOnlyButton handleClick={() => {}} />
            )}
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

  const blocks = Array.from({ length: 200 }, (_, i) => ({
    text: `This is a test block ${i}`,
    start: i * 10,
    end: i * 10 + 10,
  }));

  return (
    <div className="flex h-full flex-col justify-end">
      <ScrollArea type="auto" className="flex-1 p-4">
        <div className="space-y-4 text-sm">
          {blocks.map((message, index) => (
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

function EnhanceOnlyButton({ handleClick }: { handleClick: () => void }) {
  return (
    <button
      className={clsx([
        "rounded-xl border border-border",
        "duration-400 transition-all ease-in-out",
        "px-6 py-2",
        "bg-primary/20",
        "text-primary",
      ])}
      onClick={handleClick}
    >
      <Zap size={20} className={"fill-primary/60"} />
    </button>
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
        onClick={() => setShowRaw(true)}
        className={clsx([
          "h-9 rounded-l-xl border border-r-0 border-border px-3",
          "duration-400 transition-all ease-in-out",
          showRaw ? "bg-primary/20" : "bg-background",
          showRaw ? "text-primary" : "text-muted-foreground",
        ])}
      >
        <AlignLeft size={20} />
      </button>
      <div
        className={clsx([
          "flex h-9 flex-row items-center rounded-r-xl border border-l-0 border-border",
          "duration-400 transition-all ease-in-out",
          showRaw ? "px-3" : "pl-2 pr-1",
          !showRaw ? "bg-primary/20" : "bg-background",
          !showRaw ? "text-primary" : "text-muted-foreground",
        ])}
      >
        <button onClick={() => setShowRaw(false)}>
          <Zap
            size={20}
            className={clsx([
              "transition-[fill] duration-200 ease-in-out",
              !showRaw ? "fill-primary/60" : "fill-background",
            ])}
          />
        </button>
        {!showRaw && (
          <Popover>
            <PopoverTrigger className="flex flex-row items-center text-xs">
              <span className="rounded-xl px-2 py-0.5 hover:bg-indigo-200">
                Stand up
              </span>
            </PopoverTrigger>
            <PopoverContent>
              <div>Template Selector</div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

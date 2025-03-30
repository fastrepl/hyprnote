import { Button } from "@hypr/ui/components/ui/button";
import { Trans } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";
import { AlignLeft, Loader2, Zap } from "lucide-react";
import { motion } from "motion/react";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useHypr, useOngoingSession, useSession } from "@/contexts";
import { ENHANCE_SYSTEM_TEMPLATE_KEY, ENHANCE_USER_TEMPLATE_KEY } from "@/templates";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as dbCommands, Session } from "@hypr/plugin-db";
import { commands as listenerCommands } from "@hypr/plugin-listener";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as templateCommands } from "@hypr/plugin-template";
import Editor, { TiptapEditor } from "@hypr/tiptap/editor";
import Renderer from "@hypr/tiptap/renderer";
import { cn } from "@hypr/ui/lib/utils";
import { modelProvider, smoothStream, streamText } from "@hypr/utils/ai";
import { NoteHeader } from "./note-header";

interface EditorAreaProps {
  editable: boolean;
  sessionId: string;
}

export default function EditorArea({ editable, sessionId }: EditorAreaProps) {
  const [showRaw, setShowRaw] = useState(true);
  const { userId } = useHypr();

  const ongoingSessionTimeline = useOngoingSession((s) => s.timeline);
  const sessionStore = useSession(sessionId, (s) => ({
    session: s.session,
    updateRawNote: s.updateRawNote,
    updateEnhancedNote: s.updateEnhancedNote,
    persistSession: s.persistSession,
  }));

  const [initialContent, setInitialContent] = useState("");

  useEffect(() => {
    const content = showRaw
      ? sessionStore.session?.raw_memo_html
      : sessionStore.session?.enhanced_memo_html;

    editorRef.current?.editor?.commands?.setContent("");
    setInitialContent(content ?? "");
  }, [sessionStore.session?.id, showRaw]);

  const enhance = useMutation({
    mutationFn: async () => {
      setInitialContent("");

      const config = await dbCommands.getConfig();
      const provider = await modelProvider();

      console.log("getTimeline");
      const timeline = await listenerCommands.getTimeline(sessionId, {
        last_n_seconds: null,
      });
      console.log("timeline", timeline);

      const systemMessage = await templateCommands.render(
        ENHANCE_SYSTEM_TEMPLATE_KEY,
        {
          config,
        },
      );

      const userMessage = await templateCommands.render(
        ENHANCE_USER_TEMPLATE_KEY,
        {
          editor: sessionStore.session?.raw_memo_html ?? "",
          timeline: timeline,
        },
      );

      const { text, textStream } = streamText({
        model: provider.languageModel("any"),
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        experimental_transform: [
          smoothStream({ delayInMs: 100, chunking: "line" }),
        ],
      });

      let acc = "";
      for await (const chunk of textStream) {
        acc += chunk;
        const html = await miscCommands.opinionatedMdToHtml(acc);

        setInitialContent(html);
        sessionStore.updateEnhancedNote(html);
      }

      return text.then(miscCommands.opinionatedMdToHtml);
    },
    onSuccess: () => {
      sessionStore.persistSession();
      setShowRaw(false);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const handleChangeNote = useCallback(
    (content: string) => {
      if (showRaw) {
        sessionStore.updateRawNote(content);
      } else {
        sessionStore.updateEnhancedNote(content);
      }

      sessionStore.persistSession(); // TODO
    },
    [showRaw, sessionStore],
  );

  const handleClickEnhance = useCallback(() => {
    try {
      analyticsCommands.event({
        event: "enhance_note_clicked",
        distinct_id: userId,
        session_id: sessionId,
      });
    } catch (error) {
      console.error(error);
    }

    enhance.mutate();
  }, [enhance]);

  const editorRef = useRef<{ editor: TiptapEditor }>(null);

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <NoteHeader
        sessionId={sessionId}
        editable={editable}
        onNavigateToEditor={() => {
          editorRef.current?.editor?.commands?.focus();
        }}
      />

      <div
        id="editor-content-area"
        className={cn([
          "h-full overflow-y-auto",
          enhance.status === "pending" && "tiptap-animate",
          ongoingSessionTimeline?.items?.length && "pb-16",
        ])}
        onClick={(e) => {
          e.stopPropagation();
          editorRef.current?.editor?.commands?.focus();
        }}
      >
        <div>
          {editable
            ? (
              <Editor
                ref={editorRef}
                handleChange={handleChangeNote}
                initialContent={initialContent}
                editable={enhance.status !== "pending"}
              />
            )
            : (
              <Renderer
                ref={editorRef}
                initialContent={initialContent}
              />
            )}
        </div>
      </div>

      <AnimatePresence>
        <motion.div
          className="absolute bottom-4 w-full flex justify-center items-center pointer-events-none z-10"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="pointer-events-auto">
            <EnhanceButton
              handleClick={handleClickEnhance}
              session={sessionStore.session}
              showRaw={showRaw}
              enhanceStatus={enhance.status}
              setShowRaw={setShowRaw}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function EnhanceButton(
  { handleClick, session, showRaw, setShowRaw, enhanceStatus }: {
    handleClick: () => void;
    session: Session;
    showRaw: boolean;
    setShowRaw: (showRaw: boolean) => void;
    enhanceStatus: "error" | "idle" | "pending" | "success";
  },
) {
  const ongoingSessionStore = useOngoingSession((s) => ({
    status: s.status,
    timeline: s.timeline,
  }));

  // if (!ongoingSessionStore.timeline?.items.length) {
  //   return null;
  // }

  return (session.enhanced_memo_html || enhanceStatus === "pending")
    ? (
      <EnhanceControls
        showRaw={showRaw}
        setShowRaw={setShowRaw}
        enhanceStatus={enhanceStatus}
        handleRunEnhance={handleClick}
      />
    )
    : <EnhanceOnlyButton handleRunEnhance={handleClick} enhanceStatus={enhanceStatus} />;
}

function EnhanceOnlyButton(
  { handleRunEnhance, enhanceStatus }: {
    handleRunEnhance: () => void;
    enhanceStatus: "error" | "idle" | "pending" | "success";
  },
) {
  return (
    <Button
      variant="default"
      size="lg"
      onClick={handleRunEnhance}
      className="hover:scale-95 transition-all"
    >
      {enhanceStatus === "pending" ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
      <Trans>Hypercharge</Trans>
    </Button>
  );
}

function EnhanceControls(
  { showRaw, setShowRaw, enhanceStatus, handleRunEnhance }: {
    showRaw: boolean;
    setShowRaw: (showRaw: boolean) => void;
    enhanceStatus: "error" | "idle" | "pending" | "success";
    handleRunEnhance: () => void;
  },
) {
  const handleClickLeftButton = () => {
    setShowRaw(true);
  };

  const handleClickRightButton = () => {
    if (showRaw) {
      setShowRaw(false);
    } else {
      handleRunEnhance();
    }
  };

  return (
    <div className="flex w-fit flex-row items-center">
      <button
        disabled={enhanceStatus === "pending"}
        onClick={handleClickLeftButton}
        className={cn(
          "rounded-l-xl border-l border-y",
          "border-border px-4 py-2.5 transition-all ease-in-out",
          showRaw
            ? "bg-primary text-primary-foreground"
            : "bg-background text-neutral-200",
        )}
      >
        <AlignLeft size={20} />
      </button>

      <button
        disabled={enhanceStatus === "pending"}
        onClick={handleClickRightButton}
        className={cn(
          "rounded-r-xl border-r border-y",
          "border border-border px-4 py-2.5 transition-all ease-in-out",
          showRaw
            ? "bg-background text-neutral-200"
            : "bg-primary text-primary-foreground",
        )}
      >
        {enhanceStatus === "pending" ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
      </button>
    </div>
  );
}

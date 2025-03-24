import { useMutation } from "@tanstack/react-query";
import { smoothStream, streamText } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as listenerCommands } from "@hypr/plugin-listener";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as templateCommands } from "@hypr/plugin-template";
import Editor, { TiptapEditor } from "@hypr/tiptap/editor";
import Renderer from "@hypr/tiptap/renderer";
import { cn } from "@hypr/ui/lib/utils";
import { modelProvider } from "@hypr/utils";

import { useOngoingSession, useSession } from "@/contexts";
import { ENHANCE_SYSTEM_TEMPLATE_KEY, ENHANCE_USER_TEMPLATE_KEY } from "@/templates";
import { EnhanceControls } from "./enhanced-controls";
import { EnhanceOnlyButton } from "./enhanced-only-button";
import { NoteHeader } from "./note-header";

interface EditorAreaProps {
  editable: boolean;
  sessionId: string;
}

export default function EditorArea({ editable, sessionId }: EditorAreaProps) {
  const [showRaw, setShowRaw] = useState(true);

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

  const ongoingSessionStore = useOngoingSession((s) => ({
    listening: s.listening,
    timeline: s.timeline,
  }));

  const enhance = useMutation({
    mutationFn: async () => {
      const config = await dbCommands.getConfig();
      const provider = await modelProvider();

      const timeline = await listenerCommands.getTimeline({
        last_n_seconds: null,
      });

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
        const html = await miscCommands.opinionatedMdToHtml(chunk);

        setInitialContent(html);
        sessionStore.updateEnhancedNote(html);
      }

      return text.then(miscCommands.opinionatedMdToHtml);
    },
    onSuccess: () => {
      sessionStore.persistSession();
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
    enhance.mutate();
    setShowRaw(false);
  }, [enhance, setShowRaw]);

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
        {!ongoingSessionStore.listening
          && ongoingSessionStore.timeline?.items.length && (
          <motion.div
            className="absolute bottom-6 w-full flex justify-center items-center pointer-events-none z-10"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="pointer-events-auto">
              {ongoingSessionStore.listening
                  || sessionStore.session?.enhanced_memo_html
                ? <EnhanceControls showRaw={showRaw} setShowRaw={setShowRaw} />
                : <EnhanceOnlyButton handleClick={handleClickEnhance} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

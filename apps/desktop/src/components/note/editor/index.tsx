import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useMutation } from "@tanstack/react-query";
import { streamText, smoothStream } from "ai";
import clsx from "clsx";

import { modelProvider } from "@hypr/utils";
import Editor, { TiptapEditor } from "@hypr/tiptap/editor";
import Renderer from "@hypr/tiptap/renderer";

import { commands as listenerCommands } from "@hypr/plugin-listener";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as templateCommands } from "@hypr/plugin-template";
import {
  ENHANCE_SYSTEM_TEMPLATE_KEY,
  ENHANCE_USER_TEMPLATE_KEY,
} from "@/templates";

import { useSession } from "@/contexts";
import { useOngoingSession } from "@/contexts/ongoing-session";

import { EnhanceControls } from "./enhanced-controls";
import { EnhanceOnlyButton } from "./enhanced-only-button";
import { NoteHeader } from "../header";

export default function EditorArea() {
  const sessionStore = useSession((s) => ({
    session: s.session,
    updateRawNote: s.updateRawNote,
    updateEnhancedNote: s.updateEnhancedNote,
    persistSession: s.persistSession,
  }));

  const ongoingSessionStore = useOngoingSession((s) => ({
    listening: s.listening,
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
          editor: sessionStore.session.raw_memo_html,
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

  const [showRaw, setShowRaw] = useState(true);

  const handleChangeRawNote = useCallback(
    (content: string) => {
      sessionStore.updateRawNote(content);
    },
    [sessionStore],
  );

  const handleChangeEnhancedNote = useCallback(
    (content: string) => {
      sessionStore.updateEnhancedNote(content);
    },
    [sessionStore],
  );

  const handleClickEnhance = useCallback(() => {
    enhance.mutate();
    setShowRaw(false);
  }, [enhance, setShowRaw]);

  useEffect(() => {
    return () => {
      sessionStore.persistSession();
    };
  }, []);

  const editorRef = useRef<{ editor: TiptapEditor }>(null);
  const rendererRef = useRef<{ editor: TiptapEditor }>(null);

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <NoteHeader
        onNavigateToEditor={() => {
          if (showRaw) {
            editorRef.current?.editor?.commands?.focus();
          } else {
            rendererRef.current?.editor?.commands?.focus();
          }
        }}
      />

      <div
        className={clsx([
          "h-full overflow-y-auto",
          enhance.status === "pending" ? "tiptap-animate" : "",
        ])}
        onClick={() => {
          if (showRaw) {
            editorRef.current?.editor?.commands?.focus();
          } else {
            rendererRef.current?.editor?.commands?.focus();
          }
        }}
      >
        {showRaw ? (
          <div>
            <Editor
              ref={editorRef}
              handleChange={handleChangeRawNote}
              content={sessionStore.session.raw_memo_html}
            />
          </div>
        ) : (
          <div>
            <Renderer
              ref={rendererRef}
              handleChange={handleChangeEnhancedNote}
              content={sessionStore.session.enhanced_memo_html ?? ""}
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {!ongoingSessionStore.listening && (
          <motion.div
            className="absolute bottom-6 w-full flex justify-center items-center pointer-events-none z-10"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="pointer-events-auto">
              {ongoingSessionStore.listening ||
              sessionStore.session.enhanced_memo_html ? (
                <EnhanceControls showRaw={showRaw} setShowRaw={setShowRaw} />
              ) : (
                <EnhanceOnlyButton handleClick={handleClickEnhance} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

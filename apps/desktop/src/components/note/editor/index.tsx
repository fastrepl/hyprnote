import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useMutation } from "@tanstack/react-query";
import { streamText, smoothStream } from "ai";
import clsx from "clsx";

import { modelProvider } from "@hypr/utils";
import NoteEditor from "@hypr/tiptap/editor";
import NoteRenderer from "@hypr/tiptap/renderer";
import { commands as miscCommands } from "@hypr/plugin-misc";

import { useSession } from "@/contexts";
import { EnhanceControls } from "./enhanced-controls";
import { EnhanceOnlyButton } from "./enhanced-only-button";
import { NoteHeader } from "../header";

export default function EditorArea() {
  const enhance = useMutation({
    mutationFn: async () => {
      const provider = await modelProvider();
      const { text, textStream } = streamText({
        model: provider.languageModel("any"),
        prompt: "Hello, world!",
        experimental_transform: [
          smoothStream({
            delayInMs: 100,
            chunking: "line",
          }),
        ],
      });

      for await (const chunk of textStream) {
        const html = await miscCommands.opinionatedMdToHtml(chunk);
        console.log(html);
      }

      const html = await text.then(miscCommands.opinionatedMdToHtml);
      return html;
    },
  });

  const store = useSession((s) => ({
    session: s.session,
    timeline: s.timeline,
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

  useEffect(() => {
    if (!showRaw && !store.session.enhanced_memo_html) {
      enhance.mutate();
    }
  }, [showRaw, store.session.enhanced_memo_html, enhance]);

  useEffect(() => {
    if (enhance.data) {
      store.updateEnhancedNote(enhance.data);
    }
  }, [enhance.data]);

  useEffect(() => {
    if (enhance.status === "success" || enhance.status === "pending") {
      store.persistSession();
    }
  }, [enhance.status]);

  const editorRef = useRef<{ editor: any }>(null);
  const rendererRef = useRef<{ editor: any }>(null);

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
          <NoteEditor
            ref={editorRef}
            handleChange={handleChangeNote}
            content={store.session.raw_memo_html}
          />
        ) : (
          <NoteRenderer
            ref={rendererRef}
            handleChange={handleChangeNote}
            content={store.session.enhanced_memo_html ?? ""}
          />
        )}
      </div>

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
            !store.session.conversations.length ? null : store.session
                .enhanced_memo_html ? (
              <EnhanceControls showRaw={showRaw} setShowRaw={setShowRaw} />
            ) : (
              <EnhanceOnlyButton handleClick={() => setShowRaw(false)} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

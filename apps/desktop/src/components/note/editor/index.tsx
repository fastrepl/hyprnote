import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import NoteEditor from "@hypr/tiptap/editor";
import NoteRenderer from "@hypr/tiptap/renderer";
import { useEnhance } from "@/utils/enhance";
import { useSession } from "@/contexts";
import { EnhanceControls } from "./enhanced-controls";
import { EnhanceOnlyButton } from "./enhanced-only-button";
import { Route } from "@/routes/_nav.note.$id";
import { NoteHeader } from "../header";

export default function EditorArea() {
  const { templates, config } = Route.useLoaderData();

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

  const enhance = useEnhance({
    config,
    template: templates[0],
    pre_meeting_editor: store.session.raw_memo_html,
    in_meeting_editor: store.session.raw_memo_html,
    timeline_view: { items: [] },
    event: null,
    participants: [],
  });

  useEffect(() => {
    if (!showRaw && !store.session.enhanced_memo_html) {
      enhance.submit();
    }
  }, [showRaw, store.session.enhanced_memo_html, enhance]);

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

  const editorRef = useRef<{ editor: any }>(null);
  const rendererRef = useRef<{ editor: any }>(null);

  return (
    <main className="relative flex h-full flex-col overflow-hidden">
      <NoteHeader />

      <div
        className={clsx([
          "h-full overflow-y-auto",
          enhance.status === "loading" ? "tiptap-animate" : "",
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
    </main>
  );
}

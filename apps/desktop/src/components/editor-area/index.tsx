import { useMutation } from "@tanstack/react-query";
import usePreviousValue from "beautiful-react-hooks/usePreviousValue";
import { motion } from "motion/react";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { useHypr } from "@/contexts";
import { ENHANCE_SYSTEM_TEMPLATE_KEY, ENHANCE_USER_TEMPLATE_KEY } from "@/templates";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as templateCommands } from "@hypr/plugin-template";
import Editor, { type TiptapEditor } from "@hypr/tiptap/editor";
import Renderer from "@hypr/tiptap/renderer";
import { EDITOR_CONTENT_AREA_ID, extractHashtags } from "@hypr/tiptap/shared";
import { cn } from "@hypr/ui/lib/utils";
import { modelProvider, smoothStream, streamText } from "@hypr/utils/ai";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";
import { EnhanceButton } from "./enhance-button";
import { NoteHeader } from "./note-header";

interface EditorAreaProps {
  editable: boolean;
  sessionId: string;
}

export default function EditorArea({ editable, sessionId }: EditorAreaProps) {
  const { userId, onboardingSessionId } = useHypr();

  const { ongoingSessionTimeline, ongoingSessionStatus } = useOngoingSession((s) => ({
    ongoingSessionStatus: s.status,
    ongoingSessionTimeline: s.timeline,
  }));

  const [showRaw, setShowRaw] = useSession(sessionId, (s) => [s.showRaw, s.setShowRaw]);

  const [rawContent, setRawContent] = useSession(
    sessionId,
    (s) => [s.session?.raw_memo_html ?? "", s.updateRawNote],
  );
  const hashtags = useMemo(() => extractHashtags(rawContent), [rawContent]);

  const [enhancedContent, setEnhancedContent] = useSession(
    sessionId,
    (s) => [s.session?.enhanced_memo_html ?? "", s.updateEnhancedNote],
  );

  const sessionStore = useSession(sessionId, (s) => ({
    session: s.session,
    persistSession: s.persistSession,
    refresh: s.refresh,
  }));

  const editorRef = useRef<{ editor: TiptapEditor | null }>(null);
  const editorKey = useMemo(() => `session-${sessionId}-${showRaw ? "raw" : "enhanced"}`, [sessionId, showRaw]);

  useEffect(() => {
    sessionStore.refresh();
  }, [sessionStore.refresh, ongoingSessionStatus]);

  const enhance = useMutation({
    mutationFn: async () => {
      setEnhancedContent("");
      const config = await dbCommands.getConfig();
      const provider = await modelProvider();

      const onboardingOutputExample = await dbCommands.onboardingSessionEnhancedMemoHtml();

      const fn = sessionId === onboardingSessionId ? dbCommands.getTimelineViewOnboarding : dbCommands.getTimelineView;
      const timeline = await fn(sessionId);

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
          ...((sessionId === onboardingSessionId) ? { example: onboardingOutputExample } : {}),
        },
      );

      const { text, textStream } = streamText({
        model: provider.languageModel("any"),
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        experimental_transform: [
          smoothStream({ delayInMs: 80, chunking: "line" }),
        ],
      });

      let acc = "";
      for await (const chunk of textStream) {
        acc += chunk;
        const html = await miscCommands.opinionatedMdToHtml(acc);
        setEnhancedContent(html);
      }

      return text.then(miscCommands.opinionatedMdToHtml);
    },
    onSuccess: () => {
      try {
        analyticsCommands.event({
          event: "enhance_note_clicked",
          distinct_id: userId,
          session_id: sessionId,
        });
      } catch (error) {
        console.error(error);
      }

      sessionStore.persistSession();
    },
    onError: (error) => {
      console.error(error);
    },
  });

  // For auto-enhancing. Only needed while onboarding.
  const prevOngoingSessionStatus = usePreviousValue(ongoingSessionStatus);
  useEffect(() => {
    if (sessionId !== onboardingSessionId) {
      return;
    }

    const justFinishedListening = prevOngoingSessionStatus === "active" && ongoingSessionStatus === "inactive";

    if (justFinishedListening && !sessionStore.session.enhanced_memo_html) {
      setTimeout(() => {
        if (enhance.status === "idle") {
          enhance.mutate();
        }
      }, 1800);
    }
  }, [ongoingSessionStatus, prevOngoingSessionStatus, enhance.status, sessionStore.session.enhanced_memo_html]);

  const handleChangeNote = useCallback(
    (content: string) => {
      if (showRaw) {
        setRawContent(content);
      } else {
        setEnhancedContent(content);
      }
    },
    [showRaw, setRawContent, setEnhancedContent],
  );

  const noteContent = useMemo(
    () => showRaw ? rawContent : enhancedContent,
    // Replacing 'rawContent' with 'editorKey' in deps list is intentional. We don't want to rerender the entire editor during editing.
    [showRaw, enhancedContent, editorKey],
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

  const safelyFocusEditor = useCallback(() => {
    if (editorRef.current?.editor && editorRef.current.editor.isEditable) {
      requestAnimationFrame(() => {
        editorRef.current?.editor?.commands.focus();
      });
    }
  }, []);

  return (
    <div className="relative flex h-full flex-col w-full">
      <NoteHeader
        sessionId={sessionId}
        editable={editable}
        onNavigateToEditor={safelyFocusEditor}
        hashtags={hashtags}
      />

      <div
        id={EDITOR_CONTENT_AREA_ID}
        className={cn([
          "h-full overflow-y-auto",
          enhance.status === "pending" && "tiptap-animate",
          ongoingSessionTimeline?.items?.length && "pb-10",
        ])}
        onClick={(e) => {
          e.stopPropagation();
          safelyFocusEditor();
        }}
      >
        <div>
          {editable
            ? (
              <Editor
                key={editorKey}
                ref={editorRef}
                handleChange={handleChangeNote}
                initialContent={noteContent}
                editable={enhance.status !== "pending"}
              />
            )
            : (
              <Renderer
                ref={editorRef}
                initialContent={noteContent}
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
              key={`enhance-button-${sessionId}`}
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

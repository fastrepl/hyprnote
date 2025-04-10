import { useMutation } from "@tanstack/react-query";
import usePreviousValue from "beautiful-react-hooks/usePreviousValue";
import { motion } from "motion/react";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useHypr } from "@/contexts";
import { ENHANCE_SYSTEM_TEMPLATE_KEY, ENHANCE_USER_TEMPLATE_KEY } from "@/templates";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as templateCommands } from "@hypr/plugin-template";
import Editor, { type TiptapEditor } from "@hypr/tiptap/editor";
import Renderer from "@hypr/tiptap/renderer";
import { extractHashtags } from "@hypr/tiptap/shared";
import { cn } from "@hypr/ui/lib/utils";
import { modelProvider, smoothStream, streamText } from "@hypr/utils/ai";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";
import { EnhanceButton } from "./enhance-button";
import { NoteHeader } from "./note-header";

export default function EditorArea({
  editable,
  sessionId,
}: {
  editable: boolean;
  sessionId: string;
}) {
  const { ongoingSessionStatus } = useOngoingSession((s) => ({
    ongoingSessionStatus: s.status,
  }));

  const [showRaw, setShowRaw] = useSession(sessionId, (s) => [
    s.showRaw,
    s.setShowRaw,
  ]);

  const [rawContent, setRawContent] = useSession(sessionId, (s) => [
    s.session?.raw_memo_html ?? "",
    s.updateRawNote,
  ]);
  const hashtags = useMemo(() => extractHashtags(rawContent), [rawContent]);

  const [enhancedContent, setEnhancedContent] = useSession(sessionId, (s) => [
    s.session?.enhanced_memo_html ?? "",
    s.updateEnhancedNote,
  ]);

  const sessionStore = useSession(sessionId, (s) => ({
    session: s.session,
    refresh: s.refresh,
  }));

  const editorRef = useRef<{ editor: TiptapEditor | null }>(null);
  const editorKey = useMemo(
    () => `session-${sessionId}-${showRaw ? "raw" : "enhanced"}`,
    [sessionId, showRaw],
  );

  useEffect(() => {
    sessionStore.refresh();
  }, [sessionStore.refresh, ongoingSessionStatus]);

  const { enhance, animate } = useEnhanceMutation({
    sessionId,
    rawContent,
  });

  useAutoEnhanceForOnboarding({
    sessionId,
    enhanceStatus: enhance.status,
    enhanceMutate: enhance.mutate,
  });

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
    () => (showRaw ? rawContent : enhancedContent),
    // Replacing 'rawContent' with 'editorKey' in deps list is intentional. We don't want to rerender the entire editor during editing.
    [showRaw, enhancedContent, editorKey],
  );

  const handleClickEnhance = useCallback(() => {
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
        className={cn([
          "h-full overflow-y-auto",
          !showRaw && animate && "tiptap-animate",
          enhancedContent && "pb-10",
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
            : <Renderer ref={editorRef} initialContent={noteContent} />}
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

export function useEnhanceMutation({
  sessionId,
  rawContent,
}: {
  sessionId: string;
  rawContent: string;
}) {
  const { userId, onboardingSessionId } = useHypr();
  const [animate, setAnimate] = useState(false);

  const { persistSession, setEnhancedContent } = useSession(sessionId, (s) => ({
    persistSession: s.persistSession,
    setEnhancedContent: s.updateEnhancedNote,
  }));

  const enhance = useMutation({
    mutationFn: async () => {
      setAnimate(false);
      const config = await dbCommands.getConfig();
      const provider = await modelProvider();

      const participants = await dbCommands.sessionListParticipants(sessionId);
      const onboardingOutputExample = await dbCommands.onboardingSessionEnhancedMemoMd();

      const fn = sessionId === onboardingSessionId
        ? dbCommands.getTimelineViewOnboarding
        : dbCommands.getTimelineView;
      const timeline = await fn(sessionId);

      const systemMessage = await templateCommands.render(
        ENHANCE_SYSTEM_TEMPLATE_KEY,
        { config },
      );

      const userMessage = await templateCommands.render(
        ENHANCE_USER_TEMPLATE_KEY,
        {
          editor: rawContent,
          timeline: timeline,
          participants,
          ...(sessionId === onboardingSessionId
            ? { example: onboardingOutputExample }
            : {}),
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
        setAnimate(true);
        acc += chunk;
        const html = await miscCommands.opinionatedMdToHtml(acc);
        setEnhancedContent(html);
      }

      setAnimate(false);
      return text.then(miscCommands.opinionatedMdToHtml);
    },
    onSuccess: () => {
      analyticsCommands.event({
        event: "enhance_note_done",
        distinct_id: userId,
        session_id: sessionId,
      });

      persistSession();
    },
    onError: (error) => {
      console.error(error);
    },
  });

  return { enhance, animate };
}

export function useAutoEnhanceForOnboarding({
  sessionId,
  enhanceStatus,
  enhanceMutate,
}: {
  sessionId: string;
  enhanceStatus: string;
  enhanceMutate: () => void;
}) {
  const { userId, onboardingSessionId } = useHypr();

  const enhancedMemoHtml = useSession(
    sessionId,
    (s) => s.session.enhanced_memo_html,
  );
  const ongoingSessionStatus = useOngoingSession((s) => s.status);
  const prevOngoingSessionStatus = usePreviousValue(ongoingSessionStatus);

  useEffect(() => {
    if (sessionId !== onboardingSessionId) {
      return;
    }

    analyticsCommands.event({
      event: "onboarding_session_visited",
      distinct_id: userId,
      session_id: sessionId,
    });

    const justFinishedListening = prevOngoingSessionStatus === "active"
      && ongoingSessionStatus === "inactive";

    if (justFinishedListening && !enhancedMemoHtml) {
      setTimeout(() => {
        if (enhanceStatus === "idle") {
          analyticsCommands.event({
            event: "onboarding_auto_enhance_triggered",
            distinct_id: userId,
            session_id: sessionId,
          });

          enhanceMutate();
        }
      }, 1800);
    }
  }, [
    ongoingSessionStatus,
    prevOngoingSessionStatus,
    enhanceStatus,
    enhancedMemoHtml,
    sessionId,
    onboardingSessionId,
    enhanceMutate,
  ]);
}

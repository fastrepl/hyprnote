import { toast } from "@hypr/ui/components/ui/toast";
import { useMutation } from "@tanstack/react-query";
import usePreviousValue from "beautiful-react-hooks/usePreviousValue";
import { motion } from "motion/react";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { useHypr } from "@/contexts";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as connectorCommands } from "@hypr/plugin-connector";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as templateCommands } from "@hypr/plugin-template";
import Editor, { type TiptapEditor } from "@hypr/tiptap/editor";
import Renderer from "@hypr/tiptap/renderer";
import { extractHashtags } from "@hypr/tiptap/shared";
import { cn } from "@hypr/ui/lib/utils";
import { markdownTransform, modelProvider, smoothStream, streamText } from "@hypr/utils/ai";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";
import { enhanceFailedToast } from "../toast/shared";
import { FloatingButton } from "./floating-button";
import { NoteHeader } from "./note-header";

/**
 * Displays and manages the note editor area for a session, supporting both raw and AI-enhanced content.
 *
 * Renders an editable or read-only note editor depending on the `editable` prop, allows toggling between raw and enhanced content, and provides enhancement functionality via a floating button. Integrates with session state, mention search, and triggers automatic enhancement based on session activity.
 *
 * @param editable - Whether the editor is editable.
 * @param sessionId - Identifier for the current session.
 */
export default function EditorArea({
  editable,
  sessionId,
}: {
  editable: boolean;
  sessionId: string;
}) {
  const showRaw = useSession(sessionId, (s) => s.showRaw);
  const { userId } = useHypr();

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
  }));

  const editorRef = useRef<{ editor: TiptapEditor | null }>(null);
  const editorKey = useMemo(
    () => `session-${sessionId}-${showRaw ? "raw" : "enhanced"}`,
    [sessionId, showRaw],
  );

  const enhance = useEnhanceMutation({
    sessionId,
    rawContent,
  });

  useAutoEnhance({
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
    [showRaw, enhancedContent, rawContent],
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

  const handleMentionSearch = async (query: string) => {
    const session = await dbCommands.listSessions({ type: "search", query, user_id: userId, limit: 5 });

    return session.map((s) => ({
      id: s.id,
      type: "note",
      label: s.title,
    }));
  };

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
          enhancedContent && "pb-10",
        ])}
        onClick={(e) => {
          if (!(e.target instanceof HTMLAnchorElement)) {
            e.stopPropagation();
            safelyFocusEditor();
          }
        }}
      >
        {editable
          ? (
            <Editor
              key={editorKey}
              ref={editorRef}
              handleChange={handleChangeNote}
              initialContent={noteContent}
              editable={enhance.status !== "pending"}
              setContentFromOutside={!showRaw && enhance.status === "pending"}
              mentionConfig={{
                trigger: "@",
                handleSearch: handleMentionSearch,
              }}
            />
          )
          : <Renderer ref={editorRef} initialContent={noteContent} />}
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
            <FloatingButton
              key={`floating-button-${sessionId}`}
              handleEnhance={handleClickEnhance}
              session={sessionStore.session}
              isError={enhance.status === "error"}
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

  const setEnhanceController = useOngoingSession((s) => s.setEnhanceController);
  const { persistSession, setEnhancedContent } = useSession(sessionId, (s) => ({
    persistSession: s.persistSession,
    setEnhancedContent: s.updateEnhancedNote,
  }));

  const enhance = useMutation({
    mutationKey: ["enhance", sessionId],
    mutationFn: async () => {
      const fn = sessionId === onboardingSessionId
        ? dbCommands.getWordsOnboarding
        : dbCommands.getWords;

      const words = await fn(sessionId);

      if (!words.length) {
        toast({
          id: "short-timeline",
          title: "Recording too short",
          content: "The recording is too short to enhance",
          dismissible: true,
          duration: 5000,
        });

        return;
      }

      const { type } = await connectorCommands.getLlmConnection();

      const config = await dbCommands.getConfig();
      const participants = await dbCommands.sessionListParticipants(sessionId);

      const systemMessage = await templateCommands.render(
        "enhance.system",
        { config, type },
      );

      const userMessage = await templateCommands.render(
        "enhance.user",
        {
          type,
          editor: rawContent,
          words: JSON.stringify(words),
          participants,
        },
      );

      const abortController = new AbortController();
      const abortSignal = AbortSignal.any([abortController.signal, AbortSignal.timeout(60 * 1000)]);
      setEnhanceController(abortController);

      const provider = await modelProvider();
      const model = sessionId === onboardingSessionId
        ? provider.languageModel("onboardingModel")
        : provider.languageModel("defaultModel");

      if (sessionId !== onboardingSessionId) {
        analyticsCommands.event({
          event: "normal_enhance_start",
          distinct_id: userId,
          session_id: sessionId,
        });
      }

      const { text, textStream } = streamText({
        abortSignal,
        model,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        experimental_transform: [
          markdownTransform(),
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
      analyticsCommands.event({
        event: sessionId === onboardingSessionId
          ? "onboarding_enhance_done"
          : "normal_enhance_done",
        distinct_id: userId,
        session_id: sessionId,
      });

      persistSession();
    },
    onError: (error) => {
      console.error(error);

      if (!(error as unknown as string).includes("cancel")) {
        enhanceFailedToast();
      }
    },
  });

  return enhance;
}

export function useAutoEnhance({
  sessionId,
  enhanceStatus,
  enhanceMutate,
}: {
  sessionId: string;
  enhanceStatus: string;
  enhanceMutate: () => void;
}) {
  const { userId } = useHypr();

  const ongoingSessionStatus = useOngoingSession((s) => s.status);
  const prevOngoingSessionStatus = usePreviousValue(ongoingSessionStatus);

  useEffect(() => {
    analyticsCommands.event({
      event: "onboarding_session_visited",
      distinct_id: userId,
      session_id: sessionId,
    });

    if (
      prevOngoingSessionStatus === "running_active"
      && ongoingSessionStatus === "inactive"
      && enhanceStatus !== "pending"
    ) {
      analyticsCommands.event({
        event: "onboarding_auto_enhance_triggered",
        distinct_id: userId,
        session_id: sessionId,
      });

      enhanceMutate();
    }
  }, [
    ongoingSessionStatus,
    enhanceStatus,
    sessionId,
    enhanceMutate,
  ]);
}

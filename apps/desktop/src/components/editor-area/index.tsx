import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import usePreviousValue from "beautiful-react-hooks/usePreviousValue";
import { diffWords } from "diff";
import { motion } from "motion/react";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { useHypr } from "@/contexts";
import { extractTextFromHtml } from "@/utils/parse";
import { TemplateService } from "@/utils/template-service";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as connectorCommands } from "@hypr/plugin-connector";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as templateCommands, type Grammar } from "@hypr/plugin-template";
import Editor, { type TiptapEditor } from "@hypr/tiptap/editor";
import Renderer from "@hypr/tiptap/renderer";
import { extractHashtags } from "@hypr/tiptap/shared";
import { toast } from "@hypr/ui/components/ui/toast";
import { cn } from "@hypr/ui/lib/utils";
import {
  generateText,
  localProviderName,
  markdownTransform,
  modelProvider,
  smoothStream,
  streamText,
  tool,
} from "@hypr/utils/ai";
import { useOngoingSession, useSession, useSessions } from "@hypr/utils/contexts";
import { enhanceFailedToast } from "../toast/shared";
import { FloatingButton } from "./floating-button";
import { NoteHeader } from "./note-header";

async function generateTitleDirect(enhancedContent: string, targetSessionId: string, sessions: Record<string, any>) {
  const [config, { type }, provider] = await Promise.all([
    dbCommands.getConfig(),
    connectorCommands.getLlmConnection(),
    modelProvider(),
  ]);

  const [systemMessage, userMessage] = await Promise.all([
    templateCommands.render("create_title.system", { config, type }),
    templateCommands.render("create_title.user", { type, enhanced_note: enhancedContent }),
  ]);

  const model = provider.languageModel("defaultModel");
  const abortSignal = AbortSignal.timeout(30_000);

  const { text } = await generateText({
    abortSignal,
    model,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    providerOptions: {
      [localProviderName]: { metadata: { grammar: "title" } },
    },
  });

  const session = await dbCommands.getSession({ id: targetSessionId });
  if (!session?.title && sessions[targetSessionId]?.getState) {
    sessions[targetSessionId].getState().updateTitle(text);
  }
}

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

  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: () => TemplateService.getAllTemplates(),
    refetchOnWindowFocus: true,
  });

  const preMeetingNote = useSession(sessionId, (s) => s.session.pre_meeting_memo_html) ?? "";
  const hasTranscriptWords = useSession(sessionId, (s) => s.session.words.length > 0);

  const llmConnectionQuery = useQuery({
    queryKey: ["llm-connection"],
    queryFn: () => connectorCommands.getLlmConnection(),
  });

  const sessionsStore = useSessions((s) => s.sessions);

  const { enhance, progress } = useEnhanceMutation({
    sessionId,
    preMeetingNote,
    rawContent,
    isLocalLlm: llmConnectionQuery.data?.type === "HyprLocal",
    onSuccess: (content) => {
      if (hasTranscriptWords) {
        generateTitleDirect(content, sessionId, sessionsStore).catch(console.error);
      }
    },
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

  const handleEnhanceWithTemplate = useCallback((templateId: string) => {
    const targetTemplateId = templateId === "auto" ? null : templateId;
    enhance.mutate({ templateId: targetTemplateId, triggerType: "template" });
  }, [enhance]);

  const handleClickEnhance = useCallback(() => {
    enhance.mutate({ triggerType: "manual" });
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
          const target = e.target as HTMLElement;
          if (!target.closest("a[href]")) {
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
              handleEnhanceWithTemplate={handleEnhanceWithTemplate}
              templates={templatesQuery.data || []}
              session={sessionStore.session}
              isError={enhance.status === "error"}
              progress={progress}
              isLocalLlm={llmConnectionQuery.data?.type === "HyprLocal"}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function useEnhanceMutation({
  sessionId,
  preMeetingNote,
  rawContent,
  isLocalLlm,
  onSuccess,
}: {
  sessionId: string;
  preMeetingNote: string;
  rawContent: string;
  isLocalLlm: boolean;
  onSuccess: (enhancedContent: string) => void;
}) {
  const { userId, onboardingSessionId } = useHypr();
  const [progress, setProgress] = useState(0);
  const [actualIsLocalLlm, setActualIsLocalLlm] = useState(isLocalLlm);
  const queryClient = useQueryClient();

  const preMeetingText = extractTextFromHtml(preMeetingNote);
  const rawText = extractTextFromHtml(rawContent);

  const finalInput = diffWords(preMeetingText, rawText)
    ?.filter(diff => diff.added && !diff.removed)
    .map(diff => diff.value)
    .join(" ") || "";

  const setEnhanceController = useOngoingSession((s) => s.setEnhanceController);
  const { persistSession, setEnhancedContent } = useSession(sessionId, (s) => ({
    persistSession: s.persistSession,
    setEnhancedContent: s.updateEnhancedNote,
  }));

  const enhance = useMutation({
    mutationKey: ["enhance", sessionId],
    mutationFn: async ({
      triggerType,
      templateId,
    }: {
      triggerType: "manual" | "template" | "auto";
      templateId?: string | null;
    } = { triggerType: "manual" }) => {
      await queryClient.invalidateQueries({ queryKey: ["llm-connection"] });
      await new Promise(resolve => setTimeout(resolve, 100));

      const getWordsFunc = sessionId === onboardingSessionId ? dbCommands.getWordsOnboarding : dbCommands.getWords;
      const [{ type }, config, words] = await Promise.all([
        connectorCommands.getLlmConnection(),
        dbCommands.getConfig(),
        getWordsFunc(sessionId),
      ]);

      const freshIsLocalLlm = type === "HyprLocal";
      setActualIsLocalLlm(freshIsLocalLlm);

      if (freshIsLocalLlm) {
        setProgress(0);
      }

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

      const effectiveTemplateId = templateId !== undefined
        ? templateId
        : config.general?.selected_template_id;

      const selectedTemplate = await TemplateService.getTemplate(effectiveTemplateId ?? "");

      const participants = await dbCommands.sessionListParticipants(sessionId);

      const systemMessage = await templateCommands.render(
        "enhance.system",
        { config, type, templateInfo: selectedTemplate },
      );

      const userMessage = await templateCommands.render(
        "enhance.user",
        {
          type,
          editor: finalInput,
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
          connection_type: type,
        });
      }

      const { text, fullStream } = streamText({
        abortSignal,
        model,
        ...(freshIsLocalLlm && {
          tools: {
            update_progress: tool({ parameters: z.any() }),
          },
        }),
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        experimental_transform: [
          markdownTransform(),
          smoothStream({ delayInMs: 80, chunking: "line" }),
        ],
        ...(freshIsLocalLlm && {
          providerOptions: {
            [localProviderName]: {
              metadata: {
                grammar: {
                  task: "enhance",
                  sections: selectedTemplate?.sections.map(s => s.title) || null,
                } satisfies Grammar,
              },
            },
          },
        }),
      });

      let acc = "";
      for await (const chunk of fullStream) {
        if (chunk.type === "text-delta") {
          acc += chunk.textDelta;
        }
        if (chunk.type === "tool-call" && freshIsLocalLlm) {
          const chunkProgress = chunk.args?.progress ?? 0;
          setProgress(chunkProgress);
        }

        const html = await miscCommands.opinionatedMdToHtml(acc);
        setEnhancedContent(html);
      }

      return text.then(miscCommands.opinionatedMdToHtml);
    },
    onSuccess: (enhancedContent) => {
      onSuccess(enhancedContent ?? "");

      analyticsCommands.event({
        event: sessionId === onboardingSessionId
          ? "onboarding_enhance_done"
          : "normal_enhance_done",
        distinct_id: userId,
        session_id: sessionId,
      });

      persistSession();

      if (actualIsLocalLlm) {
        setProgress(0);
      }
    },
    onError: (error) => {
      console.error(error);
      if (actualIsLocalLlm) {
        setProgress(0);
      }

      if (!(error as unknown as string).includes("cancel")) {
        enhanceFailedToast();
      }
    },
  });

  return { enhance, progress: actualIsLocalLlm ? progress : undefined };
}

function useAutoEnhance({
  sessionId,
  enhanceStatus,
  enhanceMutate,
}: {
  sessionId: string;
  enhanceStatus: string;
  enhanceMutate: (params: { triggerType: "auto"; templateId?: string | null }) => void;
}) {
  const ongoingSessionStatus = useOngoingSession((s) => s.status);
  const autoEnhanceTemplate = useOngoingSession((s) => s.autoEnhanceTemplate);
  const setAutoEnhanceTemplate = useOngoingSession((s) => s.setAutoEnhanceTemplate);
  const prevOngoingSessionStatus = usePreviousValue(ongoingSessionStatus);
  const setShowRaw = useSession(sessionId, (s) => s.setShowRaw);

  useEffect(() => {
    if (
      prevOngoingSessionStatus === "running_active"
      && ongoingSessionStatus === "inactive"
      && enhanceStatus !== "pending"
    ) {
      setShowRaw(false);

      // Use the selected template and then clear it
      enhanceMutate({
        triggerType: "auto",
        templateId: autoEnhanceTemplate,
      });

      // Clear the template after using it (one-time use)
      setAutoEnhanceTemplate(null);
    }
  }, [
    ongoingSessionStatus,
    enhanceStatus,
    sessionId,
    enhanceMutate,
    setShowRaw,
    autoEnhanceTemplate,
    setAutoEnhanceTemplate,
    prevOngoingSessionStatus,
  ]);
}

import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import usePreviousValue from "beautiful-react-hooks/usePreviousValue";
import { diffWords } from "diff";
import { motion } from "motion/react";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useHypr } from "@/contexts";
import { extractTextFromHtml } from "@/utils/parse";
import { autoTagGeneration } from "@/utils/tag-generation";
import { TemplateService } from "@/utils/template-service";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as connectorCommands } from "@hypr/plugin-connector";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as templateCommands, type Grammar } from "@hypr/plugin-template";
import Editor, { type TiptapEditor } from "@hypr/tiptap/editor";
import Renderer from "@hypr/tiptap/renderer";
import { extractHashtags } from "@hypr/tiptap/shared";
import { toast } from "@hypr/ui/components/ui/toast";
import { cn } from "@hypr/ui/lib/utils";
import { localProviderName, modelProvider, smoothStream, streamText } from "@hypr/utils/ai";
import { useOngoingSession, useSession, useSessions } from "@hypr/utils/contexts";
import { globalEditorRef } from "../../shared/editor-ref";
import { enhanceFailedToast } from "../toast/shared";
import { AnnotationBox } from "./annotation-box";
import { FloatingButton } from "./floating-button";
import { NoteHeader } from "./note-header";
import { TextSelectionPopover } from "./text-selection-popover";
import { prepareContextText } from "./utils/summary-prepare";

const TIPS_MODAL_SHOWN_KEY = "hypr-tips-modal-shown-v1";

async function shouldShowTipsModal(
  userId: string,
  onboardingSessionId: string,
  thankYouSessionId: string,
): Promise<boolean> {
  try {
    const hasSeenTips = localStorage.getItem(TIPS_MODAL_SHOWN_KEY) === "true";
    if (hasSeenTips) {
      return false;
    }

    const allSessions = await dbCommands.listSessions({
      type: "recentlyVisited",
      user_id: userId,
      limit: 255,
    });

    const enhancedSessionsCount = allSessions.filter(session =>
      session.id !== onboardingSessionId
      && session.id !== thankYouSessionId
      && session.enhanced_memo_html
      && session.enhanced_memo_html.trim() !== ""
    ).length;

    return enhancedSessionsCount === 1;
  } catch (error) {
    console.error("Failed to check if tips modal should be shown:", error);
    return false;
  }
}
import { showTipsModal } from "../tips-modal/service";

async function generateTitleDirect(
  enhancedContent: string,
  targetSessionId: string,
  sessions: Record<string, any>,
  queryClient: QueryClient,
) {
  const title = await localLlmCommands.generateTitle({
    enhanced_note: enhancedContent,
  });

  const session = await dbCommands.getSession({ id: targetSessionId });
  if (!session?.title && sessions[targetSessionId]?.getState) {
    const cleanedTitle = title.replace(/^["']|["']$/g, "").trim();
    sessions[targetSessionId].getState().updateTitle(cleanedTitle);
  }

  // check and run auto tag generation if the session has less than 2 tags
  const sessionTags = await dbCommands.listSessionTags(targetSessionId);

  if (sessions[targetSessionId]?.getState && sessionTags.length < 2) {
    try {
      const suggestedTags = await autoTagGeneration(targetSessionId);

      if (suggestedTags.length > 1) {
        const allExistingTags = await dbCommands.listAllTags();
        const existingTagsMap = new Map(
          allExistingTags.map(tag => [tag.name.toLowerCase(), tag]),
        );

        for (const tagName of suggestedTags.slice(0, 2)) {
          try {
            const existingTag = existingTagsMap.get(tagName.toLowerCase());

            const tag = await dbCommands.upsertTag({
              id: existingTag?.id || crypto.randomUUID(),
              name: tagName,
            });

            await dbCommands.assignTagToSession(tag.id, targetSessionId);
          } catch (error) {
            console.error(`Failed to assign tag "${tagName}":`, error);
          }
        }

        queryClient.invalidateQueries({ queryKey: ["session-tags", targetSessionId] });
      }
    } catch (error) {
      console.error("Failed to generate tags:", error);
    }
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
  const { userId, onboardingSessionId, thankYouSessionId } = useHypr();

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

  // Assign editor to global ref for access by other components (like chat tools)
  useEffect(() => {
    if (editorRef.current?.editor) {
      globalEditorRef.current = editorRef.current.editor;
    }
    // Clear on unmount
    return () => {
      if (globalEditorRef.current === editorRef.current?.editor) {
        globalEditorRef.current = null;
      }
    };
  }, [editorRef.current?.editor]);
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
  const hasTranscriptWords = useSession(sessionId, (s) => s.session.words.length > (import.meta.env.DEV ? 5 : 100));

  const llmConnectionQuery = useQuery({
    queryKey: ["llm-connection"],
    queryFn: () => connectorCommands.getLlmConnection(),
    refetchOnWindowFocus: true,
  });

  const sessionsStore = useSessions((s) => s.sessions);
  const queryClient = useQueryClient();
  const { enhance, progress, isCancelled } = useEnhanceMutation({
    sessionId,
    preMeetingNote,
    rawContent,
    isLocalLlm: llmConnectionQuery.data?.type === "HyprLocal",
    onSuccess: (content) => {
      if (hasTranscriptWords) {
        generateTitleDirect(content, sessionId, sessionsStore, queryClient).catch(console.error);
      }

      if (sessionId !== onboardingSessionId) {
        setTimeout(async () => {
          try {
            const shouldShow = await shouldShowTipsModal(userId, onboardingSessionId, thankYouSessionId);
            if (shouldShow) {
              localStorage.setItem(TIPS_MODAL_SHOWN_KEY, "true");
              showTipsModal(userId);
            }
          } catch (error) {
            console.error("Failed to show tips modal:", error);
          }
        }, 1200);
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
    enhance.mutate({ templateId: targetTemplateId });
  }, [enhance]);

  const handleClickEnhance = useCallback(() => {
    enhance.mutate({});
  }, [enhance]);

  const safelyFocusEditor = useCallback(() => {
    if (editorRef.current?.editor && editorRef.current.editor.isEditable) {
      requestAnimationFrame(() => {
        editorRef.current?.editor?.commands.focus();
      });
    }
  }, []);

  const lastBacklinkSearchTime = useRef<number>(0);

  const handleMentionSearch = async (query: string) => {
    const now = Date.now();
    const timeSinceLastEvent = now - lastBacklinkSearchTime.current;

    if (timeSinceLastEvent >= 5000) {
      analyticsCommands.event({
        event: "searched_backlink",
        distinct_id: userId,
      });
      lastBacklinkSearchTime.current = now;
    }

    const session = await dbCommands.listSessions({ type: "search", query, user_id: userId, limit: 5 });

    return session.map((s) => ({
      id: s.id,
      type: "note",
      label: s.title,
    }));
  };

  const [annotationBox, setAnnotationBox] = useState<
    {
      selectedText: string;
      selectedRect: DOMRect;
    } | null
  >(null);

  const handleAnnotate = (selectedText: string, selectedRect: DOMRect) => {
    setAnnotationBox({ selectedText, selectedRect });
  };

  const handleCancelAnnotation = () => {
    setAnnotationBox(null);
  };

  const isEnhancedNote = !showRaw && !!enhancedContent;

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

      {/* Add the text selection popover - but not for onboarding sessions */}
      {sessionId !== onboardingSessionId && (
        <TextSelectionPopover
          isEnhancedNote={isEnhancedNote}
          onAnnotate={handleAnnotate}
          isAnnotationBoxOpen={!!annotationBox}
          sessionId={sessionId}
          editorRef={editorRef}
        />
      )}

      {sessionId !== onboardingSessionId && annotationBox && (
        <AnnotationBox
          selectedText={annotationBox.selectedText}
          selectedRect={annotationBox.selectedRect}
          sessionId={sessionId}
          onCancel={handleCancelAnnotation}
        />
      )}

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
              isError={enhance.status === "error" && !isCancelled}
              progress={progress}
              showProgress={llmConnectionQuery.data?.type === "HyprLocal" && sessionId !== onboardingSessionId}
              userId={userId}
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
  const [isCancelled, setIsCancelled] = useState(false);
  const queryClient = useQueryClient();

  // Extract H1 headers at component level (always available)
  const extractH1Headers = useCallback((htmlContent: string): string[] => {
    if (!htmlContent) {
      return [];
    }

    const h1Regex = /<h1[^>]*>(.*?)<\/h1>/gi;
    const headers: string[] = [];
    let match;

    while ((match = h1Regex.exec(htmlContent)) !== null) {
      const headerText = match[1].replace(/<[^>]*>/g, "").trim();
      if (headerText) {
        headers.push(headerText);
      }
    }

    return headers;
  }, []);

  const h1Headers = useMemo(() => extractH1Headers(rawContent), [rawContent, extractH1Headers]);

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

  const getCurrentEnhancedContent = useSession(sessionId, (s) => s.session?.enhanced_memo_html ?? "");

  const originalContentRef = useRef<string>("");

  const enhance = useMutation({
    mutationKey: ["enhance", sessionId],
    mutationFn: async ({
      templateId,
    }: {
      templateId?: string | null;
    }) => {
      setIsCancelled(false);
      originalContentRef.current = getCurrentEnhancedContent;
      const abortController = new AbortController();
      setEnhanceController(abortController);

      await queryClient.invalidateQueries({ queryKey: ["llm-connection"] });
      await new Promise(resolve => setTimeout(resolve, 100));

      const getWordsFunc = sessionId === onboardingSessionId ? dbCommands.getWordsOnboarding : dbCommands.getWords;

      const [{ type, connection }, config, words] = await Promise.all([
        connectorCommands.getLlmConnection(),
        dbCommands.getConfig(),
        getWordsFunc(sessionId),
      ]);

      const freshIsLocalLlm = type === "HyprLocal";
      setActualIsLocalLlm(freshIsLocalLlm);

      if (freshIsLocalLlm) {
        setProgress(0);
      }

      const wordsThreshold = import.meta.env.DEV ? 5 : 100;
      if (!words.length || words.length < wordsThreshold) {
        toast({
          id: "short-timeline",
          title: "Recording too short",
          content: `We need at least ${wordsThreshold} words to enhance your note.`,
          dismissible: true,
          duration: 5000,
        });
        return;
      }

      const effectiveTemplateId = templateId !== undefined
        ? templateId
        : config.general?.selected_template_id;

      const selectedTemplate = await TemplateService.getTemplate(effectiveTemplateId ?? "");
      let contextText = "";

      // Print context tags if they exist
      if (selectedTemplate?.context_option) {
        analyticsCommands.event({
          event: "enhance_with_context",
          distinct_id: userId,
        });
        try {
          const contextConfig = JSON.parse(selectedTemplate.context_option);
          if (contextConfig.type === "tags" && contextConfig.selections?.length > 0) {
            // Prepare and print context text from tagged sessions
            contextText = await prepareContextText(
              contextConfig.selections,
              sessionId,
              userId,
            );
          }
        } catch (e) {
          // Silent catch for malformed JSON
          console.error("Error parsing context option:", e);
        }
      }

      if (selectedTemplate !== null) {
        const eventName = selectedTemplate?.tags.includes("builtin")
          ? "builtin_template_enhancement_started"
          : "custom_template_enhancement_started";
        analyticsCommands.event({
          event: eventName,
          distinct_id: userId,
        });
      }

      const shouldUseH1Headers = !effectiveTemplateId && h1Headers.length > 0;
      const grammarSections = selectedTemplate?.sections.map(s => s.title) || null;

      const participants = await dbCommands.sessionListParticipants(sessionId);

      let customInstruction = selectedTemplate?.description;

      const systemMessage = await templateCommands.render(
        "enhance.system",
        {
          config,
          type,
          // Pass userHeaders when using H1 headers, templateInfo otherwise
          ...(shouldUseH1Headers
            ? { userHeaders: h1Headers }
            : { templateInfo: selectedTemplate, customInstruction: customInstruction }),
        },
      );

      const userMessage = await templateCommands.render(
        "enhance.user",
        {
          type,
          editor: finalInput,
          words: JSON.stringify(words),
          participants,
          ...((contextText !== "" || contextText !== undefined || contextText !== null) ? { contextText } : {}),
        },
      );

      const abortSignal = AbortSignal.any([abortController.signal, AbortSignal.timeout(120 * 1000)]);

      const provider = await modelProvider();
      const model = sessionId === onboardingSessionId
        ? provider.languageModel("onboardingModel")
        : provider.languageModel("defaultModel");

      const isHyprCloud = type !== "HyprLocal" && connection && connection.api_base.includes("pro.hyprnote.com");

      if (sessionId !== onboardingSessionId) {
        analyticsCommands.event({
          event: "normal_enhance_start",
          distinct_id: userId,
          session_id: sessionId,
          connection_type: type,
          is_hypr_cloud: isHyprCloud,
        });
      }

      const { text, fullStream } = streamText({
        abortSignal,
        model,
        onError: (error) => {
          toast({
            id: "something went wrong",
            title: "🚨 Something went wrong",
            content: (
              <div>
                Please try again or contact the team.
                <br />
                <br />
                <span className="text-xs">Error: {String(error.error)}</span>
              </div>
            ),
            dismissible: true,
            duration: 5000,
          });
          throw error;
        },
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        experimental_transform: [
          smoothStream({ delayInMs: 80, chunking: "line" }),
        ],
        ...(freshIsLocalLlm && {
          providerOptions: {
            [localProviderName]: {
              metadata: {
                grammar: {
                  task: "enhance",
                  sections: grammarSections,
                } satisfies Grammar,
              },
            },
          },
        }),
      });

      let acc = "";

      for await (const chunk of fullStream) {
        if (chunk.type === "text-delta") {
          acc += chunk.text;
        }
        if (chunk.type === "error") {
          if (originalContentRef.current !== "" && acc === "") {
            setEnhancedContent(originalContentRef.current);
          }
          throw new Error(String(chunk.error));
        }
        if (chunk.type === "tool-call" && freshIsLocalLlm) {
          const chunkProgress = chunk.input?.progress ?? 0;
          setProgress(chunkProgress);
        }

        const html = await miscCommands.opinionatedMdToHtml(acc);
        setEnhancedContent(html);
      }

      return text.then(miscCommands.opinionatedMdToHtml);
    },
    onSuccess: (enhancedContent: string | undefined) => {
      setIsCancelled(false);
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

      setEnhanceController(null);
    },
    onError: (error) => {
      console.error(error);

      const isCancellationError = (error as unknown as string).includes("cancel")
        || (error as any)?.name === "AbortError";

      setIsCancelled(isCancellationError);

      if (actualIsLocalLlm) {
        setProgress(0);
      }

      if (!isCancellationError) {
        enhanceFailedToast();
      }

      setEnhanceController(null);
    },
  });

  return { enhance, progress: actualIsLocalLlm ? progress : undefined, isCancelled };
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

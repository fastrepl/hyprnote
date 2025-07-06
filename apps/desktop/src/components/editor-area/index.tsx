import { useMutation } from "@tanstack/react-query";
import usePreviousValue from "beautiful-react-hooks/usePreviousValue";
import { diffWords } from "diff";
import { motion } from "motion/react";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { useHypr } from "@/contexts";
import { extractTextFromHtml } from "@/utils/parse";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as connectorCommands } from "@hypr/plugin-connector";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as templateCommands } from "@hypr/plugin-template";
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
import { useOngoingSession, useSession } from "@hypr/utils/contexts";
import { enhanceFailedToast } from "../toast/shared";
import { FloatingButton } from "./floating-button";
import { NoteHeader } from "./note-header";

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

  const generateTitle = useGenerateTitleMutation({ sessionId });
  const preMeetingNote = useSession(sessionId, (s) => s.session.pre_meeting_memo_html) ?? "";
  const hasTranscriptWords = useSession(sessionId, (s) => s.session.words.length > 0);

  const { enhance, progress } = useEnhanceMutation({
    sessionId,
    preMeetingNote,
    rawContent,
    onSuccess: (content) => {
      if (hasTranscriptWords) {
        generateTitle.mutate({ enhancedContent: content });
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
              session={sessionStore.session}
              isError={enhance.status === "error"}
              progress={progress}
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
  onSuccess,
}: {
  sessionId: string;
  preMeetingNote: string;
  rawContent: string;
  onSuccess: (enhancedContent: string) => void;
}) {
  const { userId, onboardingSessionId } = useHypr();
  const [progress, setProgress] = useState(0);

  const preMeetingText = extractTextFromHtml(preMeetingNote);
  const rawText = extractTextFromHtml(rawContent);

  // finalInput is the text that will be used to enhance the note
  let finalInput = "";
  const wordDiff = diffWords(preMeetingText, rawText);
  if (wordDiff && wordDiff.length > 0) {
    for (const diff of wordDiff) {
      if (diff.added && diff.removed == false) {
        finalInput += " " + diff.value;
      }
    }
  }

  const setEnhanceController = useOngoingSession((s) => s.setEnhanceController);
  const { persistSession, setEnhancedContent } = useSession(sessionId, (s) => ({
    persistSession: s.persistSession,
    setEnhancedContent: s.updateEnhancedNote,
  }));

  const enhance = useMutation({
    mutationKey: ["enhance", sessionId],
    mutationFn: async () => {
      setProgress(0); // Reset progress when starting
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

      let templateInfo = "";
      let customGrammar: string | null = null;
      const selectedTemplateId = config.general.selected_template_id;

      if (selectedTemplateId) {
        const templates = await dbCommands.listTemplates();
        const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

        if (selectedTemplate) {
          // Generate custom GBNF grammar
          if (selectedTemplate.sections && selectedTemplate.sections.length > 0) {
            customGrammar = generateCustomGBNF(selectedTemplate.sections);
          }

          // Format template as a readable string for system prompt
          templateInfo = `
SELECTED TEMPLATE:
Template Title: ${selectedTemplate.title || "Untitled"}
Template Description: ${selectedTemplate.description || "No description"}

Sections:`;

          selectedTemplate.sections?.forEach((section, index) => {
            templateInfo += `
  ${index + 1}. ${section.title || "Untitled Section"}
     └─ ${section.description || "No description"}`;
          });
        }
      }

      const participants = await dbCommands.sessionListParticipants(sessionId);

      const systemMessage = await templateCommands.render(
        "enhance.system",
        { config, type, templateInfo },
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
        const { type } = await connectorCommands.getLlmConnection();

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
        tools: {
          update_progress: tool({ parameters: z.any() }),
        },
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        experimental_transform: [
          markdownTransform(),
          smoothStream({ delayInMs: 80, chunking: "line" }),
        ],
        providerOptions: {
          [localProviderName]: {
            metadata: customGrammar
              ? {
                grammar: "custom",
                customGrammar: customGrammar,
              }
              : {
                grammar: "enhance",
              },
          },
        },
      });

      let acc = "";
      for await (const chunk of fullStream) {
        if (chunk.type === "text-delta") {
          acc += chunk.textDelta;
        }
        if (chunk.type === "tool-call") {
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
      setProgress(0);
    },
    onError: (error) => {
      setProgress(0);
      console.error(error);

      if (!(error as unknown as string).includes("cancel")) {
        enhanceFailedToast();
      }
    },
  });

  return { enhance, progress };
}

function useGenerateTitleMutation({ sessionId }: { sessionId: string }) {
  const { title, updateTitle } = useSession(sessionId, (s) => ({
    title: s.session.title,
    updateTitle: s.updateTitle,
  }));

  const generateTitle = useMutation({
    mutationKey: ["generateTitle", sessionId],
    mutationFn: async ({ enhancedContent }: { enhancedContent: string }) => {
      const config = await dbCommands.getConfig();
      const { type } = await connectorCommands.getLlmConnection();

      const systemMessage = await templateCommands.render(
        "create_title.system",
        { config, type },
      );

      const userMessage = await templateCommands.render(
        "create_title.user",
        {
          type,
          enhanced_note: enhancedContent,
        },
      );

      const abortController = new AbortController();
      const abortSignal = AbortSignal.any([abortController.signal, AbortSignal.timeout(30 * 1000)]);

      const provider = await modelProvider();
      const model = provider.languageModel("defaultModel");

      const newTitle = await generateText({
        abortSignal,
        model,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        providerOptions: {
          [localProviderName]: {
            metadata: {
              grammar: "title",
            },
          },
        },
      });

      if (!title) {
        updateTitle(newTitle.text);
      }
    },
  });

  return generateTitle;
}

function useAutoEnhance({
  sessionId,
  enhanceStatus,
  enhanceMutate,
}: {
  sessionId: string;
  enhanceStatus: string;
  enhanceMutate: () => void;
}) {
  const ongoingSessionStatus = useOngoingSession((s) => s.status);
  const prevOngoingSessionStatus = usePreviousValue(ongoingSessionStatus);

  useEffect(() => {
    if (
      prevOngoingSessionStatus === "running_active"
      && ongoingSessionStatus === "inactive"
      && enhanceStatus !== "pending"
    ) {
      enhanceMutate();
    }
  }, [
    ongoingSessionStatus,
    enhanceStatus,
    sessionId,
    enhanceMutate,
  ]);
}

function generateCustomGBNF(templateSections: any[]): string {
  if (!templateSections || templateSections.length === 0) {
    return "";
  }

  // Function to safely escape header text for GBNF string literals
  function escapeForGBNF(text: string): string {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/"/g, "\\\"")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
  }

  // Validate section titles and provide fallbacks
  const validatedSections = templateSections.map((section, index) => {
    let title = section.title || `Section ${index + 1}`;

    title = title
      .trim()
      .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
      .substring(0, 100); // Limit length to prevent issues

    return {
      ...section,
      safeTitle: title || `Section ${index + 1}`,
    };
  });

  // Generate section rules with proper escaping
  const sectionRules = validatedSections.map((section, index) => {
    const sectionName = `section${index + 1}`;
    const escapedHeader = escapeForGBNF(section.safeTitle);
    return `${sectionName} ::= "# ${escapedHeader}\\n\\n" bline bline bline? bline? bline? "\\n"`;
  }).join("\n");

  // Generate root rule with all sections
  const sectionNames = validatedSections.map((_, index) => `section${index + 1}`).join(" ");

  const grammar = `root ::= thinking ${sectionNames}

${sectionRules}

bline ::= "- **" [^*\\n:]+ "**: " ([^*;,[.\\n] | link)+ ".\\n"

hsf ::= "- Objective\\n"
hd ::= "- " [A-Z] [^[(*\\n]+ "\\n"
thinking ::= "<thinking>\\n" hsf hd hd? hd? hd? "</thinking>"

link ::= "[" [^\\]]+ "]" "(" [^)]+ ")"`;

  return grammar;
}

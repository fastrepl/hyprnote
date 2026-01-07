import { AlertCircleIcon, PlusIcon, RefreshCcwIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { md2json } from "@hypr/tiptap/shared";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/utils";

import { useListener } from "../../../../../contexts/listener";
import { useAITaskTask } from "../../../../../hooks/useAITaskTask";
import {
  useCreateEnhancedNote,
  useEnsureDefaultSummary,
} from "../../../../../hooks/useEnhancedNotes";
import {
  useLanguageModel,
  useLLMConnectionStatus,
} from "../../../../../hooks/useLLMConnection";
import * as main from "../../../../../store/tinybase/store/main";
import { createTaskId } from "../../../../../store/zustand/ai-task/task-configs";
import { type TaskStepInfo } from "../../../../../store/zustand/ai-task/tasks";
import { useTabs } from "../../../../../store/zustand/tabs";
import { type EditorView } from "../../../../../store/zustand/tabs/schema";
import { useHasTranscript } from "../shared";
import { EditingControls } from "./transcript/editing-controls";
import { TranscriptionProgress } from "./transcript/progress";

function HeaderTab({
  isActive,
  onClick = () => {},
  children,
}: {
  isActive: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn([
        "relative my-2 border-b-2 px-1 py-0.5 text-xs font-medium transition-all duration-200",
        isActive
          ? ["border-neutral-900", "text-neutral-900"]
          : [
              "border-transparent",
              "text-neutral-600",
              "hover:text-neutral-800",
            ],
      ])}
    >
      <span className="flex items-center h-5">{children}</span>
    </button>
  );
}

function TruncatedTitle({
  title,
  isActive,
}: {
  title: string;
  isActive: boolean;
}) {
  return (
    <span
      className={cn(["truncate", isActive ? "max-w-[120px]" : "max-w-[60px]"])}
    >
      {title}
    </span>
  );
}

function HeaderTabEnhanced({
  isActive,
  onClick = () => {},
  sessionId,
  enhancedNoteId,
}: {
  isActive: boolean;
  onClick?: () => void;
  sessionId: string;
  enhancedNoteId: string;
}) {
  const { isGenerating, isError, onRegenerate, onCancel, currentStep } =
    useEnhanceLogic(sessionId, enhancedNoteId);

  const title =
    main.UI.useCell("enhanced_notes", enhancedNoteId, "title", main.STORE_ID) ||
    "Summary";

  const handleRegenerateClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      void onRegenerate(null);
    },
    [onRegenerate],
  );

  if (isGenerating) {
    const step = currentStep as TaskStepInfo<"enhance"> | undefined;

    const handleCancelClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onCancel();
    };

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        className={cn([
          "group/tab relative my-2 py-0.5 px-1 text-xs font-medium transition-all duration-200 border-b-2 cursor-pointer",
          isActive
            ? ["text-neutral-900", "border-neutral-900"]
            : [
                "text-neutral-600",
                "border-transparent",
                "hover:text-neutral-800",
              ],
        ])}
      >
        <span className="flex items-center gap-1 h-5">
          <TruncatedTitle title={title} isActive={isActive} />
          <button
            type="button"
            onClick={handleCancelClick}
            className="inline-flex h-5 w-5 items-center justify-center rounded cursor-pointer hover:bg-neutral-200"
            aria-label="Cancel enhancement"
          >
            <span className="group-hover/tab:hidden flex items-center justify-center">
              {step?.type === "generating" ? (
                <img
                  src="/assets/write-animation.gif"
                  alt=""
                  aria-hidden="true"
                  className="size-3"
                />
              ) : (
                <Spinner size={14} />
              )}
            </span>
            <XIcon className="hidden group-hover/tab:flex items-center justify-center size-4" />
          </button>
        </span>
      </div>
    );
  }

  const regenerateIcon = (
    <span
      onClick={handleRegenerateClick}
      className={cn([
        "group relative inline-flex h-5 w-5 items-center justify-center rounded transition-colors cursor-pointer",
        isError
          ? [
              "text-red-600 hover:bg-red-50 hover:text-neutral-900 focus-visible:bg-red-50 focus-visible:text-neutral-900",
            ]
          : ["hover:bg-neutral-200 focus-visible:bg-neutral-200"],
      ])}
    >
      {isError && (
        <AlertCircleIcon
          size={12}
          className="pointer-events-none absolute inset-0 m-auto transition-opacity duration-200 group-hover:opacity-0 group-focus-visible:opacity-0"
        />
      )}
      <RefreshCcwIcon
        size={12}
        className={cn([
          "pointer-events-none absolute inset-0 m-auto transition-opacity duration-200",
          isError
            ? "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
            : "opacity-100",
        ])}
      />
    </span>
  );

  return (
    <button
      onClick={onClick}
      className={cn([
        "relative my-2 py-0.5 px-1 text-xs font-medium transition-all duration-200 border-b-2",
        isActive
          ? ["text-neutral-900", "border-neutral-900"]
          : [
              "text-neutral-600",
              "border-transparent",
              "hover:text-neutral-800",
            ],
      ])}
    >
      <span className="flex items-center gap-1 h-5">
        <TruncatedTitle title={title} isActive={isActive} />
        {isActive && regenerateIcon}
      </span>
    </button>
  );
}

function CreateOtherFormatButton({
  sessionId,
  handleTabChange,
}: {
  sessionId: string;
  handleTabChange: (view: EditorView) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pendingNote, setPendingNote] = useState<{
    id: string;
    templateId: string;
  } | null>(null);
  const startedTasksRef = useRef(new Set<string>());
  const templates = main.UI.useResultTable(
    main.QUERIES.visibleTemplates,
    main.STORE_ID,
  );
  const createEnhancedNote = useCreateEnhancedNote();
  const model = useLanguageModel();
  const openNew = useTabs((state) => state.openNew);

  const store = main.UI.useStore(main.STORE_ID);
  const taskId = createTaskId(pendingNote?.id || "placeholder", "enhance");
  const enhanceTask = useAITaskTask(taskId, "enhance", {
    onSuccess: ({ text }) => {
      if (text && pendingNote && store) {
        try {
          const jsonContent = md2json(text);
          store.setPartialRow("enhanced_notes", pendingNote.id, {
            content: JSON.stringify(jsonContent),
          });
        } catch (error) {
          console.error("Failed to convert markdown to JSON:", error);
        }
      }
    },
  });

  useEffect(() => {
    if (pendingNote && model && !startedTasksRef.current.has(pendingNote.id)) {
      startedTasksRef.current.add(pendingNote.id);
      void enhanceTask.start({
        model,
        args: {
          sessionId,
          enhancedNoteId: pendingNote.id,
          templateId: pendingNote.templateId,
        },
      });
    }
  }, [pendingNote, model, sessionId, enhanceTask.start]);

  const handleTemplateClick = useCallback(
    (templateId: string) => {
      setOpen(false);

      if (!model) {
        console.error("No language model available");
        return;
      }

      const enhancedNoteId = createEnhancedNote(sessionId, templateId);
      if (!enhancedNoteId) {
        console.error("Failed to create enhanced note");
        return;
      }

      void analyticsCommands.event({
        event: "note_enhanced",
        template_id: templateId,
        is_auto: false,
      });

      handleTabChange({ type: "enhanced", id: enhancedNoteId });
      setPendingNote({ id: enhancedNoteId, templateId });
    },
    [sessionId, createEnhancedNote, model, handleTabChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn([
            "relative my-2 py-0.5 px-1 text-xs font-medium transition-all duration-200",
            "text-neutral-600 hover:text-neutral-800",
            "flex items-center gap-1",
            "border-b-2 border-transparent",
          ])}
        >
          <PlusIcon size={14} />
          <span>Create other format</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="flex flex-col gap-2">
          {Object.entries(templates).length > 0 ? (
            <>
              {Object.entries(templates).map(([templateId, template]) => (
                <TemplateButton
                  key={templateId}
                  onClick={() => handleTemplateClick(templateId)}
                >
                  {template.title}
                </TemplateButton>
              ))}
              <TemplateButton
                className="italic text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
                onClick={() => {
                  setOpen(false);
                  openNew({ type: "templates" });
                }}
              >
                Manage templates
              </TemplateButton>
            </>
          ) : (
            <>
              <p className="text-sm text-neutral-600 text-center mb-2">
                No templates yet
              </p>
              <button
                onClick={() => {
                  setOpen(false);
                  openNew({ type: "templates" });
                }}
                className="px-6 py-2 rounded-full bg-gradient-to-t from-stone-600 to-stone-500 text-white text-sm font-medium transition-opacity duration-150 hover:opacity-90"
              >
                Create templates
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Header({
  sessionId,
  editorTabs,
  currentTab,
  handleTabChange,
  isEditing,
  setIsEditing,
}: {
  sessionId: string;
  editorTabs: EditorView[];
  currentTab: EditorView;
  handleTabChange: (view: EditorView) => void;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
}) {
  const sessionMode = useListener((state) => state.getSessionMode(sessionId));
  const isBatchProcessing = sessionMode === "running_batch";
  const isLiveProcessing = sessionMode === "active";
  const isMeetingOver = !isLiveProcessing && !isBatchProcessing;

  if (editorTabs.length === 1 && editorTabs[0].type === "raw") {
    return null;
  }

  const showProgress =
    currentTab.type === "transcript" && !isLiveProcessing && isBatchProcessing;
  const showEditingControls =
    currentTab.type === "transcript" && isLiveProcessing && !isBatchProcessing;

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center">
        <div className="flex gap-1 items-center">
          {editorTabs.map((view) => {
            if (view.type === "enhanced") {
              return (
                <HeaderTabEnhanced
                  key={`enhanced-${view.id}`}
                  sessionId={sessionId}
                  enhancedNoteId={view.id}
                  isActive={
                    currentTab.type === "enhanced" && currentTab.id === view.id
                  }
                  onClick={() => handleTabChange(view)}
                />
              );
            }

            return (
              <HeaderTab
                key={view.type}
                isActive={currentTab.type === view.type}
                onClick={() => handleTabChange(view)}
              >
                {labelForEditorView(view)}
              </HeaderTab>
            );
          })}
          {isMeetingOver && (
            <CreateOtherFormatButton
              sessionId={sessionId}
              handleTabChange={handleTabChange}
            />
          )}
        </div>
        {showProgress && <TranscriptionProgress sessionId={sessionId} />}
        {showEditingControls && (
          <EditingControls
            sessionId={sessionId}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
          />
        )}
      </div>
    </div>
  );
}

export function useEditorTabs({
  sessionId,
}: {
  sessionId: string;
}): EditorView[] {
  useEnsureDefaultSummary(sessionId);

  const sessionMode = useListener((state) => state.getSessionMode(sessionId));
  const hasTranscript = useHasTranscript(sessionId);
  const enhancedNoteIds = main.UI.useSliceRowIds(
    main.INDEXES.enhancedNotesBySession,
    sessionId,
    main.STORE_ID,
  );

  if (sessionMode === "active" || sessionMode === "running_batch") {
    return [{ type: "raw" }, { type: "transcript" }];
  }

  if (hasTranscript) {
    const enhancedTabs: EditorView[] = (enhancedNoteIds || []).map((id) => ({
      type: "enhanced",
      id,
    }));
    return [...enhancedTabs, { type: "raw" }, { type: "transcript" }];
  }

  return [{ type: "raw" }];
}

function labelForEditorView(view: EditorView): string {
  if (view.type === "enhanced") {
    return "Summary";
  }
  if (view.type === "raw") {
    return "Memos";
  }
  if (view.type === "transcript") {
    return "Transcript";
  }
  return "";
}

function useEnhanceLogic(sessionId: string, enhancedNoteId: string) {
  const model = useLanguageModel();
  const llmStatus = useLLMConnectionStatus();
  const taskId = createTaskId(enhancedNoteId, "enhance");
  const [missingModelError, setMissingModelError] = useState<Error | null>(
    null,
  );

  const store = main.UI.useStore(main.STORE_ID);

  const enhanceTask = useAITaskTask(taskId, "enhance", {
    onSuccess: ({ text }) => {
      if (text && store) {
        try {
          const jsonContent = md2json(text);
          store.setPartialRow("enhanced_notes", enhancedNoteId, {
            content: JSON.stringify(jsonContent),
          });
        } catch (error) {
          console.error("Failed to convert markdown to JSON:", error);
        }
      }
    },
  });

  const onRegenerate = useCallback(
    async (templateId: string | null) => {
      if (!model) {
        setMissingModelError(
          new Error("Intelligence provider not configured."),
        );
        return;
      }

      setMissingModelError(null);

      void analyticsCommands.event({
        event: "note_enhanced",
        is_auto: false,
      });

      await enhanceTask.start({
        model,
        args: {
          sessionId,
          enhancedNoteId,
          templateId: templateId ?? undefined,
        },
      });
    },
    [model, enhanceTask.start, sessionId, enhancedNoteId],
  );

  useEffect(() => {
    if (model && missingModelError) {
      setMissingModelError(null);
    }
  }, [model, missingModelError]);

  const isConfigError =
    llmStatus.status === "pending" ||
    (llmStatus.status === "error" &&
      (llmStatus.reason === "missing_config" ||
        llmStatus.reason === "unauthenticated"));

  const isIdleWithConfigError = enhanceTask.isIdle && isConfigError;

  const error = missingModelError ?? enhanceTask.error;
  const isError =
    !!missingModelError || enhanceTask.isError || isIdleWithConfigError;

  return {
    isGenerating: enhanceTask.isGenerating,
    isError,
    error,
    onRegenerate,
    onCancel: enhanceTask.cancel,
    currentStep: enhanceTask.currentStep,
  };
}

function TemplateButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      className={cn([
        "text-center text-sm py-2 px-3 rounded-md transition-colors hover:bg-neutral-100",
        className,
      ])}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

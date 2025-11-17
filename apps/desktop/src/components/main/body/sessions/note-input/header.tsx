import { AlertCircleIcon, PlusIcon, RefreshCcwIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { md2json } from "@hypr/tiptap/shared";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import { useListener } from "../../../../../contexts/listener";
import { useAITaskTask } from "../../../../../hooks/useAITaskTask";
import { useCreateEnhancedNote } from "../../../../../hooks/useEnhancedNotes";
import { useLanguageModel } from "../../../../../hooks/useLLMConnection";
import * as main from "../../../../../store/tinybase/main";
import { createTaskId } from "../../../../../store/zustand/ai-task/task-configs";
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
      {children}
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
  const { isGenerating, isError, error, onRegenerate } = useEnhanceLogic(
    sessionId,
    enhancedNoteId,
  );

  const title =
    main.UI.useCell("enhanced_notes", enhancedNoteId, "title", main.STORE_ID) ||
    "Summary";

  const handleRegenerateClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRegenerate(null);
    },
    [onRegenerate],
  );

  if (isGenerating) {
    return (
      <HeaderTab isActive={isActive} onClick={onClick}>
        <span className="flex items-center gap-1">
          <TruncatedTitle title={title} isActive={isActive} />
        </span>
      </HeaderTab>
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
      <span className="flex items-center gap-1">
        <TruncatedTitle title={title} isActive={isActive} />
        {isActive && (
          <div className="flex items-center gap-1">
            {isError ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>{regenerateIcon}</TooltipTrigger>
                {error && (
                  <TooltipContent side="bottom">
                    <p className="text-xs max-w-xs">
                      {error instanceof Error ? error.message : String(error)}
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            ) : (
              regenerateIcon
            )}
          </div>
        )}
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
          ])}
        >
          <PlusIcon size={14} />
          <span>Create other format</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="flex flex-col gap-2">
          {Object.entries(templates).length > 0 ? (
            Object.entries(templates).map(([templateId, template]) => (
              <TemplateButton
                key={templateId}
                onClick={() => handleTemplateClick(templateId)}
              >
                {template.title}
              </TemplateButton>
            ))
          ) : (
            <TemplateButton
              className="italic text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
              onClick={() => {
                setOpen(false);
                handleGoToTemplates();
              }}
            >
              Create templates
            </TemplateButton>
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
  isInactive,
  isEditing,
  setIsEditing,
}: {
  sessionId: string;
  editorTabs: EditorView[];
  currentTab: EditorView;
  handleTabChange: (view: EditorView) => void;
  isInactive: boolean;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
}) {
  if (editorTabs.length === 1 && editorTabs[0].type === "raw") {
    return null;
  }

  const isBatchProcessing = useListener((state) => sessionId in state.batch);

  const showProgress =
    currentTab.type === "transcript" && (isInactive || isBatchProcessing);
  const showEditingControls =
    currentTab.type === "transcript" && isInactive && !isBatchProcessing;

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
          <CreateOtherFormatButton
            sessionId={sessionId}
            handleTabChange={handleTabChange}
          />
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
  const sessionMode = useListener((state) => state.getSessionMode(sessionId));
  const hasTranscript = useHasTranscript(sessionId);
  const enhancedNoteIds = main.UI.useSliceRowIds(
    main.INDEXES.enhancedNotesBySession,
    sessionId,
    main.STORE_ID,
  );

  if (sessionMode === "running_active" || sessionMode === "running_batch") {
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

  const error = missingModelError ?? enhanceTask.error;
  const isError = !!missingModelError || enhanceTask.isError;

  return {
    isGenerating: enhanceTask.isGenerating,
    isError,
    error,
    onRegenerate,
  };
}

function handleGoToTemplates() {
  windowsCommands
    .windowShow({ type: "settings" })
    .then(() => new Promise((resolve) => setTimeout(resolve, 1000)))
    .then(() =>
      windowsCommands.windowEmitNavigate(
        { type: "settings" },
        {
          path: "/app/settings",
          search: { tab: "templates" },
        },
      ),
    );
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

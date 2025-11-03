import { useCallback, useState } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { cn } from "@hypr/utils";
import { AlertCircleIcon, RefreshCcwIcon, SparklesIcon } from "lucide-react";
import { useAITask } from "../../../../../contexts/ai-task";
import { useListener } from "../../../../../contexts/listener";
import { useLanguageModel } from "../../../../../hooks/useLLMConnection";
import { useTaskStatus } from "../../../../../hooks/useTaskStatus";
import * as main from "../../../../../store/tinybase/main";
import { createTaskId } from "../../../../../store/zustand/ai-task/task-configs";
import { getTaskState } from "../../../../../store/zustand/ai-task/tasks";
import { type EditorView } from "../../../../../store/zustand/tabs/schema";
import { useHasTranscript } from "../shared";

function HeaderTab({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn([
        "relative my-2 py-0.5 px-1 text-xs font-medium transition-all duration-200 border-b-2",
        isActive
          ? ["text-neutral-900", "border-neutral-900"]
          : ["text-neutral-600", "border-transparent", "hover:text-neutral-800"],
      ])}
    >
      {children}
    </button>
  );
}

function HeaderTabEnhanced(
  { isActive, onClick, sessionId }: { isActive: boolean; onClick: () => void; sessionId: string },
) {
  const [open, setOpen] = useState(false);
  const { model, templates, isGenerating, isError, onRegenerate } = useEnhanceLogic(sessionId);

  const handleTabClick = useCallback(() => {
    if (!isActive) {
      onClick();
    }
  }, [isActive, onClick]);

  const handleIconClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!model) {
      handleConfigureModel();
      return;
    }
    if (isError) {
      onRegenerate(null);
      return;
    }
    setOpen(!open);
  }, [model, isError, open, onRegenerate]);

  const handleTemplateClick = useCallback((templateId: string | null) => {
    setOpen(false);
    onRegenerate(templateId);
  }, [onRegenerate]);

  if (isGenerating) {
    return (
      <HeaderTab isActive={isActive} onClick={handleTabClick}>
        <span className="flex items-center gap-1">
          <span>Summary</span>
        </span>
      </HeaderTab>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <button
        onClick={handleTabClick}
        className={cn([
          "relative my-2 py-0.5 px-1 text-xs font-medium transition-all duration-200 border-b-2",
          isActive
            ? ["text-neutral-900", "border-neutral-900"]
            : ["text-neutral-600", "border-transparent", "hover:text-neutral-800"],
        ])}
      >
        <span className="flex items-center gap-1">
          <span>Summary</span>
          {isActive && (
            <PopoverTrigger asChild>
              <span
                onClick={handleIconClick}
                className={cn([
                  "p-0.5 rounded hover:bg-neutral-200 transition-colors cursor-pointer",
                  isError && "text-red-600 hover:bg-red-50",
                ])}
              >
                {isError ? <AlertCircleIcon size={12} /> : <RefreshCcwIcon size={12} />}
              </span>
            </PopoverTrigger>
          )}
        </span>
      </button>
      <PopoverContent className="w-64" align="start">
        <div className="flex flex-col gap-2">
          {Object.entries(templates).length > 0
            ? (
              Object.entries(templates).map(([templateId, template]) => (
                <TemplateButton
                  key={templateId}
                  onClick={() => handleTemplateClick(templateId)}
                >
                  {template.title}
                </TemplateButton>
              ))
            )
            : (
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

          <div className="flex items-center gap-3 text-neutral-400 text-sm my-1">
            <div className="flex-1 h-px bg-neutral-300"></div>
            <span>or</span>
            <div className="flex-1 h-px bg-neutral-300"></div>
          </div>

          <TemplateButton
            className={cn([
              "flex items-center justify-center gap-2",
              "text-neutral-100 bg-neutral-800 hover:bg-neutral-700",
            ])}
            onClick={() => handleTemplateClick(null)}
          >
            <SparklesIcon className="w-4 h-4" />
            <span className="text-sm">Auto</span>
          </TemplateButton>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Header(
  {
    sessionId,
    editorTabs,
    currentTab,
    handleTabChange,
  }: {
    sessionId: string;
    editorTabs: EditorView[];
    currentTab: EditorView;
    handleTabChange: (view: EditorView) => void;
  },
) {
  if (editorTabs.length === 1 && editorTabs[0] === "raw") {
    return null;
  }

  return (
    <div className="flex gap-1">
      {editorTabs.map((view) => {
        if (view === "enhanced") {
          return (
            <HeaderTabEnhanced
              key={view}
              sessionId={sessionId}
              isActive={currentTab === view}
              onClick={() => handleTabChange(view)}
            />
          );
        }

        return (
          <HeaderTab
            key={view}
            isActive={currentTab === view}
            onClick={() => handleTabChange(view)}
          >
            {labelForEditorView(view)}
          </HeaderTab>
        );
      })}
    </div>
  );
}

export function useEditorTabs({ sessionId }: { sessionId: string }): EditorView[] {
  const { status, sessionId: activeSessionId } = useListener((state) => ({
    status: state.status,
    sessionId: state.sessionId,
  }));
  const hasTranscript = useHasTranscript(sessionId);

  if (status === "running_active" && activeSessionId === sessionId) {
    return ["raw", "transcript"];
  }

  if (hasTranscript) {
    return ["enhanced", "raw", "transcript"];
  }

  return ["raw"];
}

function labelForEditorView(view: EditorView): string {
  if (view === "enhanced") {
    return "Summary";
  }
  if (view === "raw") {
    return "Memos";
  }
  if (view === "transcript") {
    return "Transcript";
  }
  return "";
}

function useEnhanceLogic(sessionId: string) {
  const model = useLanguageModel();
  const taskId = createTaskId(sessionId, "enhance");

  const enhancedMd = main.UI.useCell("sessions", sessionId, "enhanced_md", main.STORE_ID);

  const updateEnhancedMd = main.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: string) => ({ enhanced_md: input }),
    [],
    main.STORE_ID,
  );

  const { generate, rawStatus, streamedText, error } = useAITask((state) => {
    const taskState = getTaskState(state.tasks, taskId);
    return {
      generate: state.generate,
      rawStatus: taskState?.status ?? "idle",
      streamedText: taskState?.streamedText ?? "",
      error: taskState?.error,
    };
  });

  const { isGenerating, isError } = useTaskStatus(rawStatus, {
    onSuccess: () => {
      if (streamedText) {
        updateEnhancedMd(streamedText);
      }
    },
  });

  const templates = main.UI.useResultTable(main.QUERIES.visibleTemplates, main.STORE_ID);

  const onRegenerate = useCallback(async (templateId: string | null) => {
    if (!model) {
      return;
    }

    await generate(taskId, {
      model,
      taskType: "enhance",
      args: { sessionId, templateId: templateId ?? undefined },
    });
  }, [model, generate, taskId, sessionId]);

  const hasContent = !!enhancedMd && enhancedMd.trim().length > 0;

  return {
    model,
    templates,
    isGenerating,
    isError,
    error,
    onRegenerate,
    hasContent,
  };
}

function handleConfigureModel() {
  windowsCommands.windowShow({ type: "settings" })
    .then(() => new Promise((resolve) => setTimeout(resolve, 1000)))
    .then(() =>
      windowsCommands.windowEmitNavigate({ type: "settings" }, {
        path: "/app/settings",
        search: { tab: "intelligence" },
      })
    );
}

function handleGoToTemplates() {
  windowsCommands.windowShow({ type: "settings" })
    .then(() => new Promise((resolve) => setTimeout(resolve, 1000)))
    .then(() =>
      windowsCommands.windowEmitNavigate({ type: "settings" }, {
        path: "/app/settings",
        search: { tab: "templates" },
      })
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

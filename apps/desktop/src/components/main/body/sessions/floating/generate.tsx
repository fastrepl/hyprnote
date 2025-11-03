import type { LanguageModel } from "ai";
import { AlertCircleIcon, SparklesIcon } from "lucide-react";
import { useCallback, useState } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { cn } from "@hypr/utils";
import { useAITaskTask } from "../../../../../hooks/useAITaskTask";
import { useLanguageModel } from "../../../../../hooks/useLLMConnection";
import * as main from "../../../../../store/tinybase/main";
import { createTaskId } from "../../../../../store/zustand/ai-task/task-configs";
import { ActionableTooltipContent, FloatingButton } from "./shared";

export function GenerateButton({ sessionId }: { sessionId: string }) {
  const [showTemplates, setShowTemplates] = useState(false);
  const { model, templates, isGenerating, isError, error, onRegenerate, hasContent } = useGenerateButton(sessionId);

  const handleConfigureModel = useCallback(() => {
    windowsCommands.windowShow({ type: "settings" })
      .then(() => new Promise((resolve) => setTimeout(resolve, 1000)))
      .then(() =>
        windowsCommands.windowEmitNavigate({ type: "settings" }, {
          path: "/app/settings",
          search: { tab: "intelligence" },
        })
      );
  }, []);

  if (isGenerating) {
    return null;
  }

  const { icon, text, tooltip } = getButtonConfig(isError, model, error, handleConfigureModel);

  return (
    <div>
      <div
        className={cn([
          "absolute left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg border",
          "px-6 pb-4 overflow-visible",
          "transition-all duration-300",
          showTemplates
            ? ["opacity-100 bottom-[-14px] pt-2 w-[270px]", "pointer-events-auto"]
            : ["opacity-0 bottom-0 pt-0 w-0", "pointer-events-none"],
        ])}
        style={{ zIndex: 0 }}
        onMouseEnter={() => setShowTemplates(true)}
        onMouseLeave={() => setShowTemplates(false)}
      >
        <div className={cn(["transition-opacity duration-200", showTemplates ? "opacity-100" : "opacity-0"])}>
          <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
            {Object.entries(templates).length > 0
              ? (
                Object.entries(templates).map(([templateId, template]) => (
                  <TemplateButton
                    key={templateId}
                    className="hover:bg-neutral-100"
                    onClick={() => {
                      setShowTemplates(false);
                      onRegenerate(templateId);
                    }}
                  >
                    {template.title}
                  </TemplateButton>
                ))
              )
              : (
                <TemplateButton
                  className="italic text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
                  onClick={() => {
                    setShowTemplates(false);
                    handleGoToTemplates();
                  }}
                >
                  Create templates
                </TemplateButton>
              )}
          </div>

          <Divider />

          <TemplateButton
            className={cn([
              "flex items-center justify-center gap-2 w-full",
              "text-neutral-100 bg-neutral-800 hover:bg-neutral-700 mt-3",
            ])}
            onClick={() => {
              setShowTemplates(false);
              onRegenerate(null);
            }}
          >
            <SparklesIcon className="w-4 h-4" />
            <span className="text-sm">Auto</span>
          </TemplateButton>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <FloatingButton
          icon={icon}
          onMouseEnter={() => !isError && setShowTemplates(true)}
          onMouseLeave={() => setShowTemplates(false)}
          onClick={() => {
            setShowTemplates(false);
            onRegenerate(null);
          }}
          disabled={!model}
          tooltip={tooltip}
          error={isError}
          subtle={hasContent && !showTemplates}
        >
          <span>{text}</span>
        </FloatingButton>
      </div>
    </div>
  );
}

function useGenerateButton(sessionId: string) {
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

  const enhanceTask = useAITaskTask(taskId, "enhance", {
    onSuccess: ({ text }) => {
      if (text) {
        updateEnhancedMd(text);
      }
    },
  });

  const templates = main.UI.useResultTable(main.QUERIES.visibleTemplates, main.STORE_ID);

  const onRegenerate = useCallback(async (templateId: string | null) => {
    if (!model) {
      return;
    }

    await enhanceTask.start({
      model,
      args: { sessionId, templateId: templateId ?? undefined },
    });
  }, [model, enhanceTask.start, sessionId]);

  const hasContent = !!enhancedMd && enhancedMd.trim().length > 0;

  return {
    model,
    templates,
    isGenerating: enhanceTask.isGenerating,
    isError: enhanceTask.isError,
    error: enhanceTask.error,
    onRegenerate,
    hasContent,
  };
}

function getButtonConfig(
  isError: boolean,
  model: LanguageModel | null,
  error: Error | undefined,
  handleConfigureModel: () => void,
) {
  const icon = isError ? <AlertCircleIcon className="w-4 h-4" /> : <SparklesIcon className="w-4 h-4" />;
  const text = isError ? "Retry" : "Regenerate";

  const tooltip = !model
    ? {
      side: "top" as const,
      content: (
        <ActionableTooltipContent
          message="Language model not available."
          action={{
            label: "Configure",
            handleClick: handleConfigureModel,
          }}
        />
      ),
    }
    : isError && error
    ? { content: error.message, side: "top" as const }
    : undefined;

  return { icon, text, tooltip };
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
        "text-center text-base py-2 rounded-lg transition-colors",
        className,
      ])}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-neutral-400 text-sm mt-3">
      <div className="flex-1 h-px bg-neutral-300"></div>
      <span>or</span>
      <div className="flex-1 h-px bg-neutral-300"></div>
    </div>
  );
}

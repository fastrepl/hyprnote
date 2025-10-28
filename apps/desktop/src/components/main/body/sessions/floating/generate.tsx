import { SparklesIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@hypr/utils";
import { useAITask } from "../../../../../contexts/ai-task";
import { useLanguageModel } from "../../../../../hooks/useLLMConnection";
import { useTaskStatus } from "../../../../../hooks/useTaskStatus";
import * as persisted from "../../../../../store/tinybase/persisted";
import { createTaskId } from "../../../../../store/zustand/ai-task/task-configs";
import { getTaskState } from "../../../../../store/zustand/ai-task/tasks";
import { FloatingButton } from "./shared";

export function GenerateButton({ sessionId }: { sessionId: string }) {
  const [showTemplates, setShowTemplates] = useState(false);
  const model = useLanguageModel();

  const taskId = createTaskId(sessionId, "enhance");

  const updateEnhancedMd = persisted.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: string) => ({ enhanced_md: input }),
    [],
    persisted.STORE_ID,
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

  const { isGenerating } = useTaskStatus(rawStatus, {
    onSuccess: () => {
      console.log("onSuccess", streamedText);
      if (streamedText) {
        updateEnhancedMd(streamedText);
      }
    },
    onError: () => {
      console.error("Generate failed:", error?.message || "Unknown error");
    },
  });

  const templates = persisted.UI.useResultTable(persisted.QUERIES.visibleTemplates, persisted.STORE_ID);

  const onRegenerate = async (templateId: string | null) => {
    if (!model) {
      console.error("Generate failed: Language model not configured");
      return;
    }

    await generate(taskId, {
      model,
      taskType: "enhance",
      args: { sessionId, templateId: templateId ?? undefined },
    });
  };

  if (isGenerating) {
    return null;
  }

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
                  <button
                    key={templateId}
                    className={cn([
                      "text-center text-base",
                      "py-2 rounded-lg hover:bg-neutral-100 transition-colors",
                    ])}
                    onClick={() => {
                      setShowTemplates(false);
                      onRegenerate(templateId);
                    }}
                  >
                    {template.title}
                  </button>
                ))
              )
              : (
                <button
                  className={cn([
                    "text-center text-base text-neutral-500",
                    "py-2",
                    "hover:bg-neutral-100 transition-colors",
                    "rounded",
                  ])}
                  onClick={() => {
                    console.log("Navigate to template creation");
                    setShowTemplates(false);
                  }}
                >
                  Create templates
                </button>
              )}
          </div>

          <Divider />

          <button
            className={cn([
              "flex items-center justify-center gap-2 w-full",
              "text-center text-base text-neutral-100",
              "rounded-lg py-2 mt-3",
              "bg-neutral-800 hover:bg-neutral-700 transition-colors",
            ])}
            onClick={() => {
              setShowTemplates(false);
              onRegenerate(null);
            }}
          >
            <SparklesIcon className="w-4 h-4" />
            <span className="text-sm">Auto</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <FloatingButton
          icon={<SparklesIcon className="w-4 h-4" />}
          onMouseEnter={() => setShowTemplates(true)}
          onMouseLeave={() => setShowTemplates(false)}
          onClick={() => {
            setShowTemplates(false);
            onRegenerate(null);
          }}
          disabled={!model}
          tooltip={!model
            ? {
              content: "Language model not configured",
              side: "top",
            }
            : undefined}
        >
          <span>Regenerate</span>
        </FloatingButton>
      </div>
    </div>
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

import { cn } from "@hypr/utils";
import { SparklesIcon } from "lucide-react";
import { useState } from "react";

import { useAITask } from "../../../../../contexts/ai-task";
import { useLanguageModel } from "../../../../../hooks/useLLMConnection";
import * as persisted from "../../../../../store/tinybase/persisted";

import { FloatingButton } from "./shared";

export function GenerateButton({ sessionId }: { sessionId: string }) {
  const [showTemplates, setShowTemplates] = useState(false);
  const model = useLanguageModel();

  const taskId = `${sessionId}-enhance`;

  const { generate, status } = useAITask((state) => ({
    generate: state.generate,
    status: state.tasks[taskId]?.status ?? "idle",
  }));

  const templates = persisted.UI.useResultTable(persisted.QUERIES.visibleTemplates, persisted.STORE_ID);
  const rawMd = persisted.UI.useCell("sessions", sessionId, "raw_md", persisted.STORE_ID);

  const updateEnhancedMd = persisted.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: string) => ({ enhanced_md: input }),
    [],
    persisted.STORE_ID,
  );

  const onRegenerate = async (_templateId: string | null) => {
    if (!model) {
      return;
    }

    await generate(taskId, {
      model,
      taskType: "enhance",
      args: { rawMd },
      onComplete: updateEnhancedMd,
    });
  };

  const isGenerating = status === "generating";

  if (isGenerating) {
    return null;
  }

  return (
    <div>
      <div
        className={cn([
          "absolute left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg border",
          "px-6 pb-14 overflow-visible",
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
            {Object.entries(templates).map(([templateId, template]) => (
              <button
                key={templateId}
                className="text-center py-2 hover:bg-neutral-100 rounded transition-colors text-base"
                onClick={() => {
                  setShowTemplates(false);
                  onRegenerate(templateId);
                }}
              >
                {template.title}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-neutral-400 text-sm mt-3">
            <div className="flex-1 h-px bg-neutral-300"></div>
            <span>or</span>
            <div className="flex-1 h-px bg-neutral-300"></div>
          </div>
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
        >
          <span>Regenerate</span>
        </FloatingButton>
      </div>
    </div>
  );
}

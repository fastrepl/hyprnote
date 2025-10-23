import { cn } from "@hypr/utils";
import { Loader2, SparklesIcon } from "lucide-react";
import { useState } from "react";

import { useAITask } from "../../../../../contexts/ai-task";
import { useLanguageModel } from "../../../../../hooks/useLLMConnection";
import * as persisted from "../../../../../store/tinybase/persisted";

import { FloatingButton } from "./shared";

export function GenerateButton({ sessionId }: { sessionId: string }) {
  const [showTemplates, setShowTemplates] = useState(false);
  const model = useLanguageModel();

  const taskId = `${sessionId}-enhance`;

  const { generate, cancel, status } = useAITask((state) => ({
    generate: state.generate,
    cancel: state.cancel,
    status: state.tasks.get(taskId)?.status ?? "idle",
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
    if (!model || !rawMd) {
      return;
    }

    const prompt =
      "Generate some random meeting summry, following markdown format. Start with h1 header and no more that h3. Each header should have more that 5 points, bullet points.";

    await generate(taskId, {
      model,
      prompt,
      onComplete: updateEnhancedMd,
    });
  };

  const isGenerating = status === "generating";

  return (
    <div>
      <div
        className={cn([
          "absolute left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg border",
          "px-6 pb-14 overflow-visible",
          "transition-all duration-300",
          showTemplates && !isGenerating
            ? ["opacity-100 bottom-[-14px] pt-2 w-[270px]", "pointer-events-auto"]
            : ["opacity-0 bottom-0 pt-0 w-0", "pointer-events-none"],
        ])}
        style={{ zIndex: 0 }}
        onMouseEnter={() => !isGenerating && setShowTemplates(true)}
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

      <FloatingButton
        icon={isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
        onMouseEnter={() => !isGenerating && setShowTemplates(true)}
        onMouseLeave={() => setShowTemplates(false)}
        onClick={() => {
          if (isGenerating) {
            cancel(taskId);
          } else {
            setShowTemplates(false);
            onRegenerate(null);
          }
        }}
      >
        {isGenerating ? "Cancel" : "Regenerate"}
      </FloatingButton>
    </div>
  );
}

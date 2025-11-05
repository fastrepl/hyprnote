import { Loader2Icon } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef } from "react";
import { Streamdown } from "streamdown";

import { cn } from "@hypr/utils";
import { useAITaskTask } from "../../../../../../hooks/useAITaskTask";
import { createTaskId, type TaskId } from "../../../../../../store/zustand/ai-task/task-configs";
import { type TaskStepInfo } from "../../../../../../store/zustand/ai-task/tasks";

export function StreamingView({ sessionId }: { sessionId: string }) {
  const taskId = createTaskId(sessionId, "enhance");
  const { streamedText, cancel, isGenerating } = useAITaskTask(taskId, "enhance");

  const containerRef = useAutoScrollToBottom(streamedText);

  return (
    <div ref={containerRef} className="flex flex-col pb-2 space-y-1">
      <Streamdown
        components={streamdownComponents}
        disallowedElements={["code", "pre"]}
        className={cn(["space-y-2"])}
      >
        {streamedText}
      </Streamdown>

      <Status taskId={taskId} cancel={cancel} isGenerating={isGenerating} />
    </div>
  );
}

const HEADING_SHARED = "text-gray-700 font-semibold text-sm mt-0 mb-1 min-h-6";

const streamdownComponents = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    return <h1 className={cn([HEADING_SHARED, "text-xl"])}>{props.children as React.ReactNode}</h1>;
  },
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    return <h2 className={cn([HEADING_SHARED, "text-lg"])}>{props.children as React.ReactNode}</h2>;
  },
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    return <h3 className={cn([HEADING_SHARED, "text-base"])}>{props.children as React.ReactNode}</h3>;
  },
  h4: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    return <h4 className={cn([HEADING_SHARED, "text-sm"])}>{props.children as React.ReactNode}</h4>;
  },
  h5: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    return <h5 className={cn([HEADING_SHARED, "text-sm"])}>{props.children as React.ReactNode}</h5>;
  },
  h6: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    return <h6 className={cn([HEADING_SHARED, "text-xs"])}>{props.children as React.ReactNode}</h6>;
  },
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => {
    return <ul className="list-disc pl-6 mb-1 block relative">{props.children as React.ReactNode}</ul>;
  },
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => {
    return <ol className="list-decimal pl-6 mb-1 block relative">{props.children as React.ReactNode}</ol>;
  },
  li: (props: React.HTMLAttributes<HTMLLIElement>) => {
    return <li className="mb-1">{props.children as React.ReactNode}</li>;
  },
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => {
    return <p className="py-2">{props.children as React.ReactNode}</p>;
  },
} as const;

function Status({
  taskId,
  cancel,
  isGenerating,
}: {
  taskId: TaskId<"enhance">;
  cancel: () => void;
  isGenerating: boolean;
}) {
  const { currentStep } = useAITaskTask(taskId, "enhance");
  const step = currentStep as TaskStepInfo<"enhance"> | undefined;

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (!isGenerating) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    cancel();
  }, [cancel, isGenerating]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!isGenerating) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      cancel();
    }
  }, [cancel, isGenerating]);

  let statusText = "Loading";
  if (step?.type === "analyzing") {
    statusText = "Analyzing structure...";
  } else if (step?.type === "generating") {
    statusText = "Generating";
  } else if (step?.type === "retrying") {
    statusText = `Retrying (attempt ${step.attempt})...`;
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, layout: { duration: 0.15 } }}
      className={cn([
        "group flex items-center justify-center w-[calc(100%-24px)] gap-3",
        "border border-neutral-200",
        "bg-neutral-800 rounded-lg py-3",
        isGenerating ? "cursor-pointer hover:bg-neutral-700" : "",
      ])}
      role={isGenerating ? "button" : undefined}
      tabIndex={isGenerating ? 0 : undefined}
      aria-label={isGenerating ? "Cancel enhance task" : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <Loader2Icon className="w-4 h-4 animate-spin text-neutral-50" />
      <span className="text-xs text-neutral-50 group-hover:hidden">
        {statusText}
      </span>
      {isGenerating && (
        <span className="hidden text-xs text-neutral-50 group-hover:inline">
          Press to cancel
        </span>
      )}
    </motion.div>
  );
}

function useAutoScrollToBottom(text: string) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scrollableParent = container.parentElement;
    if (!scrollableParent) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = scrollableParent;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    if (isNearBottom) {
      scrollableParent.scrollTop = scrollHeight;
    }
  }, [text]);

  return containerRef;
}

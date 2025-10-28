import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { Streamdown } from "streamdown";

import { cn } from "@hypr/utils";
import { useAITask } from "../../../../../../contexts/ai-task";
import { createTaskId, type TaskId } from "../../../../../../store/zustand/ai-task/task-configs";
import { getTaskState, type TaskStepInfo } from "../../../../../../store/zustand/ai-task/tasks";

export function StreamingView({ sessionId }: { sessionId: string }) {
  const taskId = createTaskId(sessionId, "enhance");
  const text = useAITask((state) => getTaskState(state.tasks, taskId)?.streamedText ?? "");

  const containerRef = useAutoScrollToBottom(text);

  return (
    <div ref={containerRef} className="flex flex-col pb-2 space-y-1">
      <div
        className={cn([
          "text-sm leading-relaxed",
          "whitespace-pre-wrap break-words",
        ])}
      >
        <Streamdown
          disallowedElements={["code", "pre"]}
          components={components}
        >
          {text}
        </Streamdown>
      </div>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, layout: { duration: 0.15 } }}
        className={cn([
          "flex items-center justify-center w-[calc(100%-24px)] gap-3",
          "border border-neutral-200",
          "bg-neutral-800 rounded-lg py-3",
        ])}
      >
        <Status taskId={taskId} />
      </motion.div>
    </div>
  );
}

const components = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    return <h1 className="text-lg font-bold pt-2">{props.children as React.ReactNode}</h1>;
  },
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => {
    return <ul className="list-disc list-inside flex flex-col gap-1.5">{props.children as React.ReactNode}</ul>;
  },
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => {
    return <ol className="list-decimal list-inside flex flex-col gap-1.5">{props.children as React.ReactNode}</ol>;
  },
  li: (props: React.HTMLAttributes<HTMLLIElement>) => {
    return <li className="list-item">{props.children as React.ReactNode}</li>;
  },
} as const;

function Status({ taskId }: { taskId: TaskId<"enhance"> }) {
  const step = useAITask((state) => getTaskState(state.tasks, taskId)?.currentStep) as
    | TaskStepInfo<"enhance">
    | undefined;

  if (!step) {
    return (
      <div className="flex items-center gap-2">
        <Loader2Icon className="w-4 h-4 animate-spin text-neutral-50" />
        <span className="text-xs text-neutral-50">
          Loading
        </span>
      </div>
    );
  }

  if (step.type === "generating") {
    return (
      <div className="flex items-center gap-2">
        <Loader2Icon className="w-4 h-4 animate-spin text-neutral-50" />
        <span className="text-xs text-neutral-50">
          Generating
        </span>
      </div>
    );
  }

  const icon = step.type === "tool-call"
    ? <Loader2Icon className="w-4 h-4 animate-spin text-neutral-50" />
    : <CheckCircle2Icon className="w-4 h-4 text-neutral-50" />;

  if (step.toolName === "analyzeStructure") {
    return (
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-neutral-50">
          Analyzing structure...
        </span>
      </div>
    );
  }
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

import { Streamdown } from "streamdown";

import { cn } from "@hypr/utils";

import { useAITaskTask } from "../../../../../../hooks/useAITaskTask";
import { createTaskId } from "../../../../../../store/zustand/ai-task/task-configs";
import { type TaskStepInfo } from "../../../../../../store/zustand/ai-task/tasks";

export function StreamingView({ enhancedNoteId }: { enhancedNoteId: string }) {
  const taskId = createTaskId(enhancedNoteId, "enhance");
  const { streamedText, currentStep, isGenerating } = useAITaskTask(
    taskId,
    "enhance",
  );

  const step = currentStep as TaskStepInfo<"enhance"> | undefined;
  const hasContent = streamedText.length > 0;

  let statusText: string | null = null;
  if (isGenerating && !hasContent) {
    if (step?.type === "analyzing") {
      statusText = "Analyzing structure...";
    } else if (step?.type === "generating") {
      statusText = "Generating...";
    } else if (step?.type === "retrying") {
      statusText = `Retrying (attempt ${step.attempt})...`;
    } else {
      statusText = "Loading...";
    }
  }

  return (
    <div className="pb-2">
      {statusText ? (
        <p className="text-sm text-neutral-500">{statusText}</p>
      ) : (
        <Streamdown
          components={streamdownComponents}
          className={cn(["flex flex-col gap-2"])}
        >
          {streamedText}
        </Streamdown>
      )}
    </div>
  );
}

const HEADING_SHARED = "text-gray-700 font-semibold text-sm mt-0 mb-1 min-h-6";

const streamdownComponents = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    return (
      <h1 className={cn([HEADING_SHARED, "text-xl"])}>
        {props.children as React.ReactNode}
      </h1>
    );
  },
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    return (
      <h2 className={cn([HEADING_SHARED, "text-lg"])}>
        {props.children as React.ReactNode}
      </h2>
    );
  },
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    return (
      <h3 className={cn([HEADING_SHARED, "text-base"])}>
        {props.children as React.ReactNode}
      </h3>
    );
  },
  h4: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    return (
      <h4 className={cn([HEADING_SHARED, "text-sm"])}>
        {props.children as React.ReactNode}
      </h4>
    );
  },
  h5: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    return (
      <h5 className={cn([HEADING_SHARED, "text-sm"])}>
        {props.children as React.ReactNode}
      </h5>
    );
  },
  h6: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    return (
      <h6 className={cn([HEADING_SHARED, "text-xs"])}>
        {props.children as React.ReactNode}
      </h6>
    );
  },
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => {
    return (
      <ul className="list-disc pl-6 mb-1 block relative">
        {props.children as React.ReactNode}
      </ul>
    );
  },
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => {
    return (
      <ol className="list-decimal pl-6 mb-1 block relative">
        {props.children as React.ReactNode}
      </ol>
    );
  },
  li: (props: React.HTMLAttributes<HTMLLIElement>) => {
    return <li className="mb-1">{props.children as React.ReactNode}</li>;
  },
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => {
    return <p className="py-2">{props.children as React.ReactNode}</p>;
  },
} as const;

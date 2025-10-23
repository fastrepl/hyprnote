import { Loader2Icon } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { Streamdown } from "streamdown";

import { cn } from "@hypr/utils";

export function StreamingView({ text }: { text: string }) {
  const containerRef = useAutoScrollToBottom(text);

  const components = {
    h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
      return <h2 className="text-lg font-bold pt-2">{props.children as React.ReactNode}</h2>;
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

  return (
    <div ref={containerRef} className="flex flex-col pb-20 space-y-4">
      <div
        className={cn([
          "text-sm leading-relaxed",
          "whitespace-pre-wrap break-words",
        ])}
      >
        <Streamdown
          disallowedElements={["code", "pre", "h1"]}
          components={components}
        >
          {text}
        </Streamdown>
      </div>
      <motion.div
        layout
        className={cn([
          "flex items-center justify-center w-[calc(100%-24px)] gap-3",
          "border border-neutral-200",
          "bg-neutral-800 rounded-lg py-3",
        ])}
      >
        <Loader2Icon className="w-4 h-4 animate-spin text-neutral-50" />
        <span className="text-xs text-neutral-50">Generating...</span>
      </motion.div>
    </div>
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

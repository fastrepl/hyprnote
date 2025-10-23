import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { Streamdown } from "streamdown";

import { cn } from "@hypr/utils";

export function StreamingView({ text }: { text: string }) {
  const containerRef = useAutoScrollToBottom();

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
        <motion.div>
          <Streamdown
            disallowedElements={["code", "pre", "h1"]}
            components={components}
          >
            {text}
          </Streamdown>
        </motion.div>
      </div>

      <div
        className={cn([
          "flex items-center justify-center w-full gap-3",
          "border border-neutral-200",
          "bg-neutral-50 rounded-lg py-2",
        ])}
      >
        <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
        <span className="text-xs text-neutral-500">Generating...</span>
      </div>
    </div>
  );
}

function useAutoScrollToBottom() {
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
  }, [containerRef]);

  return containerRef;
}

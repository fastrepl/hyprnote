import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { Streamdown } from "streamdown";

import { cn } from "@hypr/utils";

export function StreamingView({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    let parent = node.parentElement;
    while (parent) {
      if (parent.classList.contains("overflow-auto")) {
        if (parent.scrollHeight > parent.clientHeight) {
          parent.scrollTo({ top: parent.scrollHeight, behavior: "smooth" });
        }
        break;
      }
      parent = parent.parentElement;
    }
  }, [text]);

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
        ref={bottomRef}
        className={cn([
          "flex items-center justify-center gap-3",
          "w-full py-4",
          "border border-neutral-200",
          "bg-neutral-50",
          "rounded-lg",
        ])}
      >
        <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
        <span className="text-sm font-medium text-neutral-600">Generating...</span>
      </div>
    </div>
  );
}

import { motion } from "motion/react";
import { ReactNode, useEffect, useRef } from "react";
import { Streamdown } from "streamdown";

import { cn } from "@hypr/utils";

export function StreamingView({ text, after }: { text: string; after: ReactNode }) {
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
        <motion.div>
          <Streamdown
            disallowedElements={["code", "pre", "h1"]}
            components={components}
          >
            {text}
          </Streamdown>
        </motion.div>
      </div>
      {after}
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

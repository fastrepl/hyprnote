import { Loader2 } from "lucide-react";
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

  return (
    <div ref={containerRef} className="flex flex-col pb-20 space-y-4">
      <div
        className={cn([
          "text-sm leading-relaxed",
          "whitespace-pre-wrap break-words",
        ])}
      >
        <Streamdown className="text-sm mt-1 mb-6">
          {text}
        </Streamdown>
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

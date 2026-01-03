import { BrainIcon, CheckIcon, CopyIcon, RotateCcwIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Streamdown } from "streamdown";

import type { ToolPartType } from "../../../chat/tools";
import type { HyprUIMessage } from "../../../chat/types";
import { hasRenderableContent } from "../shared";
import { Disclosure, MessageBubble, MessageContainer } from "./shared";
import { Tool } from "./tool";
import type { Part } from "./types";

function getMessageText(message: HyprUIMessage): string {
  return message.parts
    .filter((part): part is Extract<Part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

export function NormalMessage({
  message,
  handleReload,
}: {
  message: HyprUIMessage;
  handleReload?: () => void;
}) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = getMessageText(message);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [message]);

  if (!hasRenderableContent(message)) {
    return null;
  }

  return (
    <MessageContainer align={isUser ? "end" : "start"}>
      <div className="flex flex-col max-w-[80%] group">
        <MessageBubble variant={isUser ? "user" : "assistant"}>
          {message.parts.map((part, i) => (
            <Part key={i} part={part as Part} />
          ))}
        </MessageBubble>
        {!isUser && (
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className={`p-1 transition-colors ${copied ? "text-green-500" : "text-neutral-400 hover:text-neutral-600"}`}
              aria-label="Copy message"
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            </button>
            {handleReload && (
              <button
                onClick={handleReload}
                className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
                aria-label="Regenerate message"
              >
                <RotateCcwIcon size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </MessageContainer>
  );
}

function Part({ part }: { part: Part }) {
  if (part.type === "reasoning") {
    return <Reasoning part={part} />;
  }
  if (part.type === "text") {
    return <Text part={part} />;
  }
  if (part.type === "step-start") {
    return null;
  }

  if (part.type.startsWith("tool-")) {
    const toolPart = part as Extract<Part, { type: ToolPartType }>;
    return <Tool part={toolPart} />;
  }

  return <pre>{JSON.stringify(part, null, 2)}</pre>;
}

function Reasoning({ part }: { part: Extract<Part, { type: "reasoning" }> }) {
  const cleaned = part.text
    .replace(/[\n`*#"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const streaming = part.state !== "done";
  const title = streaming ? cleaned.slice(-150) : cleaned;

  return (
    <Disclosure
      icon={<BrainIcon className="w-3 h-3" />}
      title={title}
      disabled={streaming}
    >
      <div className="text-sm text-neutral-500 whitespace-pre-wrap">
        {part.text}
      </div>
    </Disclosure>
  );
}

function Text({ part }: { part: Extract<Part, { type: "text" }> }) {
  const components = {
    h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
      return (
        <h2 className="text-lg font-bold pt-2">
          {props.children as React.ReactNode}
        </h2>
      );
    },
    ul: (props: React.HTMLAttributes<HTMLUListElement>) => {
      return (
        <ul className="list-disc list-inside flex flex-col gap-1.5">
          {props.children as React.ReactNode}
        </ul>
      );
    },
    ol: (props: React.HTMLAttributes<HTMLOListElement>) => {
      return (
        <ol className="list-decimal list-inside flex flex-col gap-1.5">
          {props.children as React.ReactNode}
        </ol>
      );
    },
    li: (props: React.HTMLAttributes<HTMLLIElement>) => {
      return <li className="list-item">{props.children as React.ReactNode}</li>;
    },
  } as const;

  const isAnimating = part.state !== "done";

  return (
    <Streamdown
      components={components}
      className="px-0.5 py-1"
      isAnimating={isAnimating}
    >
      {part.text}
    </Streamdown>
  );
}

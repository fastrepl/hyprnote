import { formatDistanceToNow } from "date-fns";
import { BrainIcon, RotateCcw } from "lucide-react";
import { Streamdown } from "streamdown";

import { cn } from "@hypr/ui/lib/utils";
import type { ToolPartType } from "../../../chat/tools";
import type { HyprUIMessage } from "../../../chat/types";
import { hasRenderableContent } from "../shared";
import { Disclosure } from "./shared";
import { Tool } from "./tool";
import type { Part } from "./types";

export function ChatBodyMessage({ message, handleReload }: { message: HyprUIMessage; handleReload?: () => void }) {
  const isUser = message.role === "user";

  const shouldShowTimestamp = message.metadata?.createdAt
    ? (Date.now() - message.metadata.createdAt) >= 60000
    : false;

  if (!hasRenderableContent(message)) {
    return null;
  }

  return (
    <div
      className={cn([
        "flex px-4 py-2",
        isUser ? "justify-end" : "justify-start",
      ])}
    >
      <div className="flex flex-col max-w-[80%]">
        <div
          className={cn([
            "rounded-2xl px-4 py-2",
            isUser ? "bg-blue-100 text-gray-800" : "bg-gray-100 text-gray-800",
            !isUser && "relative group",
          ])}
        >
          {message.parts.map((part, i) => <Part key={i} part={part as Part} />)}
          {!isUser && handleReload && (
            <button
              onClick={handleReload}
              className={cn([
                "absolute -top-1 -right-1",
                "opacity-0 group-hover:opacity-100",
                "transition-opacity",
                "p-1 rounded-full",
                "bg-gray-200 hover:bg-gray-300",
                "text-gray-600 hover:text-gray-800",
              ])}
              aria-label="Reload message"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
        {shouldShowTimestamp && message.metadata?.createdAt && (
          <div className="text-xs text-gray-400 mt-1 px-2">
            {formatDistanceToNow(message.metadata.createdAt, { addSuffix: true })}
          </div>
        )}
      </div>
    </div>
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
      <div className="text-sm text-gray-500 whitespace-pre-wrap">
        {part.text}
      </div>
    </Disclosure>
  );
}

function Text({ part }: { part: Extract<Part, { type: "text" }> }) {
  return (
    <Streamdown className="prose prose-sm dark:prose-invert max-w-none">
      {part.text}
    </Streamdown>
  );
}

import { formatDistanceToNow } from "@hypr/utils";
import { BrainIcon, RotateCcw } from "lucide-react";
import { Streamdown } from "streamdown";

import type { ToolPartType } from "../../../chat/tools";
import type { HyprUIMessage } from "../../../chat/types";
import { hasRenderableContent } from "../shared";
import { ActionButton, Disclosure, MessageBubble, MessageContainer } from "./shared";
import { Tool } from "./tool";
import type { Part } from "./types";

export function NormalMessage({ message, handleReload }: { message: HyprUIMessage; handleReload?: () => void }) {
  const isUser = message.role === "user";

  const shouldShowTimestamp = message.metadata?.createdAt
    ? (Date.now() - message.metadata.createdAt) >= 60000
    : false;

  if (!hasRenderableContent(message)) {
    return null;
  }

  return (
    <MessageContainer align={isUser ? "end" : "start"}>
      <div className="flex flex-col max-w-[80%]">
        <MessageBubble
          variant={isUser ? "user" : "assistant"}
          withActionButton={!isUser && !!handleReload}
        >
          {message.parts.map((part, i) => <Part key={i} part={part as Part} />)}
          {!isUser && handleReload && (
            <ActionButton
              onClick={handleReload}
              variant="default"
              icon={RotateCcw}
              label="Reload message"
            />
          )}
        </MessageBubble>
        {shouldShowTimestamp && message.metadata?.createdAt && (
          <div className="text-xs text-gray-400 mt-1 px-2">
            {formatDistanceToNow(message.metadata.createdAt, { addSuffix: true })}
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

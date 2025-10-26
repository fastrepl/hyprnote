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
          <div className="text-xs text-neutral-400 mt-1 px-2">
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
      <div className="text-sm text-neutral-500 whitespace-pre-wrap">
        {part.text}
      </div>
    </Disclosure>
  );
}

function Text({ part }: { part: Extract<Part, { type: "text" }> }) {
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
    <Streamdown
      components={components}
      className="px-0.5 py-1"
    >
      {part.text}
    </Streamdown>
  );
}

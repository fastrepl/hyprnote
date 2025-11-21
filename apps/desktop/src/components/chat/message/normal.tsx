import { BrainIcon, PaperclipIcon, RotateCcw } from "lucide-react";
import { Streamdown } from "streamdown";

import { formatDistanceToNow } from "@hypr/utils";

import type { ToolPartType } from "../../../chat/tools";
import type { HyprUIMessage } from "../../../chat/types";
import { hasRenderableContent } from "../shared";
import {
  ActionButton,
  Disclosure,
  MessageBubble,
  MessageContainer,
} from "./shared";
import { Tool } from "./tool";
import type { Part } from "./types";

export function NormalMessage({
  message,
  handleReload,
}: {
  message: HyprUIMessage;
  handleReload?: () => void;
}) {
  const isUser = message.role === "user";

  const shouldShowTimestamp = message.metadata?.createdAt
    ? Date.now() - message.metadata.createdAt >= 60000
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
          {message.parts.map((part, i) => (
            <Part key={i} part={part as Part} />
          ))}
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
            {formatDistanceToNow(message.metadata.createdAt, {
              addSuffix: true,
            })}
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
  if (part.type === "file") {
    return <FileAttachment part={part as Extract<Part, { type: "file" }>} />;
  }
  if (part.type === "data-chat-file") {
    return (
      <ChatFileAttachment
        part={part as Extract<Part, { type: "data-chat-file" }>}
      />
    );
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

  return (
    <Streamdown components={components} className="px-0.5 py-1">
      {part.text}
    </Streamdown>
  );
}

function FileAttachment({ part }: { part: Extract<Part, { type: "file" }> }) {
  const isImage = part.mediaType?.startsWith("image/");
  const label = part.filename ?? "Attachment";

  return (
    <div className="mt-2 flex flex-col gap-1">
      {isImage ? (
        <img
          src={part.url}
          alt={label}
          className="max-h-64 rounded-lg border border-neutral-200 object-contain bg-white"
        />
      ) : null}
      <a
        href={part.url}
        target="_blank"
        rel="noreferrer"
        download={label}
        className="flex items-center gap-2 px-3 py-2 rounded-md border border-neutral-200 bg-white text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
      >
        <PaperclipIcon className="w-4 h-4 text-neutral-500" />
        <span className="truncate">{label}</span>
        <span className="text-[11px] text-neutral-400">
          {part.mediaType?.split("/")[1]?.toUpperCase() ?? ""}
        </span>
      </a>
    </div>
  );
}

function ChatFileAttachment({
  part,
}: {
  part: Extract<Part, { type: "data-chat-file" }>;
}) {
  const isImage = part.data.mediaType?.startsWith("image/");
  const label = part.data.filename ?? "Attachment";

  return (
    <div className="mt-2 flex flex-col gap-1">
      {isImage ? (
        <img
          src={part.data.fileUrl}
          alt={label}
          className="max-h-64 rounded-lg border border-neutral-200 object-contain bg-white"
        />
      ) : null}
      <a
        href={part.data.fileUrl}
        target="_blank"
        rel="noreferrer"
        download={label}
        className="flex items-center gap-2 px-3 py-2 rounded-md border border-neutral-200 bg-white text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
      >
        <PaperclipIcon className="w-4 h-4 text-neutral-500" />
        <span className="truncate">{label}</span>
        <span className="text-[11px] text-neutral-400">
          {part.data.mediaType?.split("/")[1]?.toUpperCase() ?? ""}
        </span>
      </a>
    </div>
  );
}

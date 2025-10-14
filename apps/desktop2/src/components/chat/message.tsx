import type { UIMessagePart } from "ai";
import { formatDistanceToNow } from "date-fns";
import { BrainIcon, ChevronRight, Loader2, RotateCcw, SearchIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Streamdown } from "streamdown";

import { cn } from "@hypr/ui/lib/utils";

import type { ToolPartType, Tools } from "../../chat/tools";
import type { HyprUIMessage } from "../../chat/types";
import { hasRenderableContent } from "./shared";

type Part = UIMessagePart<{}, Tools>;

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
    return <Tool part={part as Extract<Part, { type: `tool-${string}` }>} />;
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

function Tool({ part }: { part: Extract<Part, { type: ToolPartType }> }) {
  if (part.type === "tool-search_sessions") {
    return <ToolSearchSessions part={part} />;
  }
  return <pre>{JSON.stringify(part)}</pre>;
}

function ToolSearchSessions({ part }: { part: Extract<Part, { type: "tool-search_sessions" }> }) {
  const getTitle = () => {
    if (part.state === "input-streaming") {
      return "Preparing search...";
    }
    if (part.state === "input-available") {
      return `Searching for: ${part.input.query}`;
    }
    if (part.state === "output-available") {
      return `Searched for: ${part.input.query}`;
    }
    if (part.state === "output-error") {
      return part.input ? `Search failed: ${part.input.query}` : "Search failed";
    }
    return "Search";
  };

  const getChildren = () => {
    if (part.state === "output-available" && part.output) {
      return (
        <pre className="text-xs overflow-auto">
          {JSON.stringify(part.output, null, 2)}
        </pre>
      );
    }
    if (part.state === "output-error") {
      return <div className="text-sm text-red-500">Error: {part.errorText}</div>;
    }

    return null;
  };

  const disabled = part.state === "input-streaming" || part.state === "input-available";

  return (
    <Disclosure
      icon={<SearchIcon className="w-3 h-3" />}
      title={getTitle()}
      disabled={disabled}
    >
      {getChildren()}
    </Disclosure>
  );
}

function Disclosure(
  {
    icon,
    title,
    children,
    disabled,
  }: {
    icon: ReactNode;
    title: ReactNode;
    children: ReactNode;
    disabled?: boolean;
  },
) {
  return (
    <details
      className={cn([
        "group px-2 py-1 my-2 border rounded-md transition-colors",
        "cursor-pointer border-gray-200 hover:border-gray-300",
      ])}
    >
      <summary
        className={cn([
          "w-full",
          "text-xs text-gray-500",
          "select-none list-none marker:hidden",
          "flex items-center gap-2",
        ])}
      >
        {disabled ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        {(!disabled && icon) && <span className="flex-shrink-0">{icon}</span>}
        <span
          className={cn([
            "flex-1 truncate",
            "group-open:font-medium",
          ])}
        >
          {title}
        </span>
        <ChevronRight className="w-3 h-3 flex-shrink-0 transition-transform group-open:rotate-90" />
      </summary>
      <div className="mt-1 pt-2 px-1 border-t border-gray-200">
        {children}
      </div>
    </details>
  );
}

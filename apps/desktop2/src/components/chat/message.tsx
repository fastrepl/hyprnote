import type { UIMessage, UIMessagePart } from "ai";
import { BrainIcon, ChevronRight, Loader2, SearchIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Streamdown } from "streamdown";

import { cn } from "@hypr/ui/lib/utils";

import type { ToolPartType, Tools } from "../../chat/tools";

type Part = UIMessagePart<{}, Tools>;

export function ChatBodyMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn([
        "flex px-4 py-2",
        isUser ? "justify-end" : "justify-start",
      ])}
    >
      <div
        className={cn([
          "max-w-[80%] rounded-2xl px-4 py-2",
          isUser ? "bg-blue-100 text-gray-800" : "bg-gray-100 text-gray-800",
        ])}
      >
        {message.parts.map((part, i) => <Part key={i} part={part as Part} />)}
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
  const firstSentence = part.text.split(/[.!?]\s/)[0] + ".";
  const cleanTitle = firstSentence
    .replace(/^"([^"]*)"/, "$1")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/^#+\s*/gm, "")
    .trim();

  return (
    <Disclosure
      icon={<BrainIcon className="w-3 h-3" />}
      title={cleanTitle}
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
      icon={disabled ? <Loader2 className="w-3 h-3 animate-spin" /> : <SearchIcon className="w-3 h-3" />}
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
        disabled
          ? ["opacity-50 cursor-not-allowed border-gray-200"]
          : ["cursor-pointer border-gray-200 hover:border-gray-300"],
      ])}
    >
      <summary
        className={cn([
          "w-full",
          "text-xs text-gray-500",
          "select-none list-none marker:hidden",
          "flex items-center gap-2",
        ])}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
          }
        }}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
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

import type { UIMessage } from "ai";
import { Streamdown } from "streamdown";

import { cn } from "@hypr/ui/lib/utils";

export function ChatBodyMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  const content = message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");

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
          isUser ? "bg-blue-500 text-white" : "bg-neutral-100 text-neutral-900",
        ])}
      >
        <Markdown content={content} />
      </div>
    </div>
  );
}

function Markdown({ content }: { content: string }) {
  return (
    <Streamdown className="prose prose-sm dark:prose-invert max-w-none">
      {content}
    </Streamdown>
  );
}

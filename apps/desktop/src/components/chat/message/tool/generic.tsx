import { WrenchIcon } from "lucide-react";

import { Disclosure } from "../shared";

function formatToolName(name: string): string {
  return name.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function extractOutputText(output: unknown): string | null {
  if (!output || typeof output !== "object") return null;
  const obj = output as Record<string, unknown>;
  if (Array.isArray(obj.content)) {
    const texts = obj.content
      .filter(
        (c: unknown) =>
          typeof c === "object" &&
          c !== null &&
          (c as Record<string, unknown>).type === "text" &&
          (c as Record<string, unknown>).text,
      )
      .map((c: unknown) => (c as { text: string }).text);
    if (texts.length > 0) return texts.join("\n");
  }
  return null;
}

export function ToolGeneric({ part }: { part: Record<string, unknown> }) {
  const toolName = String(
    part.toolName ??
      (typeof part.type === "string" ? part.type.replace("tool-", "") : "tool"),
  );
  const state = part.state as string;
  const running = state === "input-streaming" || state === "input-available";
  const failed = state === "output-error";

  const title = running
    ? `Running ${formatToolName(toolName)}…`
    : failed
      ? `${formatToolName(toolName)} failed`
      : formatToolName(toolName);

  return (
    <Disclosure
      icon={<WrenchIcon className="w-3 h-3" />}
      title={title}
      disabled={running}
    >
      <Content part={part} />
    </Disclosure>
  );
}

function InputDisplay({ input }: { input: unknown }) {
  if (!input || typeof input !== "object") return null;
  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length === 0) return null;

  return (
    <dl className="text-xs text-neutral-500 flex flex-col gap-1">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="font-medium text-neutral-600 inline">{key}: </dt>
          <dd className="inline whitespace-pre-wrap wrap-break-word">
            {typeof value === "string" ? value : JSON.stringify(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Content({ part }: { part: Record<string, unknown> }) {
  if (part.state === "output-error") {
    return (
      <div className="flex flex-col gap-2">
        <InputDisplay input={part.input} />
        <p className="text-xs text-red-500">
          {String(part.errorText ?? "Unknown error")}
        </p>
      </div>
    );
  }

  if (part.state === "output-available") {
    const text = part.output ? extractOutputText(part.output) : null;
    return (
      <div className="flex flex-col gap-2">
        <InputDisplay input={part.input} />
        {text && (
          <p className="text-xs text-neutral-600 whitespace-pre-wrap">{text}</p>
        )}
      </div>
    );
  }

  return null;
}

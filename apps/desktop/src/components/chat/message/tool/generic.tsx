import { WrenchIcon } from "lucide-react";

import { Disclosure } from "../shared";
import {
  ToolCard,
  ToolCardApproval,
  ToolCardBody,
  ToolCardHeader,
  useToolApproval,
  useToolState,
} from "./shared";

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
  const { running, failed } = useToolState(part as { state: string });
  const done = (part.state as string) === "output-available";
  const awaitingApproval = useToolApproval(running);

  if (awaitingApproval) {
    return (
      <ToolCard>
        <ToolCardHeader
          icon={<WrenchIcon />}
          running={running}
          awaitingApproval
          failed={false}
          done={false}
          label={`${formatToolName(toolName)} — review needed`}
        />
        {part.input ? (
          <ToolCardBody>
            <InputDisplay input={part.input} />
          </ToolCardBody>
        ) : null}
        <ToolCardApproval />
      </ToolCard>
    );
  }

  if (done || failed) {
    const outputText =
      done && part.output ? extractOutputText(part.output) : null;

    return (
      <Disclosure
        icon={<WrenchIcon className="w-3 h-3" />}
        title={
          failed
            ? `${formatToolName(toolName)} failed`
            : formatToolName(toolName)
        }
      >
        <div className="flex flex-col gap-2">
          <InputDisplay input={part.input} />
          {failed ? (
            <p className="text-xs text-red-500">
              {String(part.errorText ?? "Unknown error")}
            </p>
          ) : null}
          {outputText ? (
            <p className="text-xs text-neutral-600 whitespace-pre-wrap">
              {outputText}
            </p>
          ) : null}
        </div>
      </Disclosure>
    );
  }

  return (
    <Disclosure
      icon={<WrenchIcon className="w-3 h-3" />}
      title={`Running ${formatToolName(toolName)}…`}
      disabled
    >
      {null}
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

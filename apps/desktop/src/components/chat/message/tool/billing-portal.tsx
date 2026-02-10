import { ExternalLinkIcon } from "lucide-react";

import {
  extractMcpOutputText,
  parseCreateBillingPortalSessionOutput,
} from "../../../../chat/support-mcp-tools";
import type { ToolRenderer } from "../types";
import {
  ToolCard,
  ToolCardFooterError,
  ToolCardFooterRaw,
  ToolCardFooterSuccess,
  ToolCardHeader,
} from "./shared";

type Renderer = ToolRenderer<"tool-create_billing_portal_session">;

function headerLabel(
  running: boolean,
  failed: boolean,
  parsed: ReturnType<typeof parseCreateBillingPortalSessionOutput>,
): string {
  if (running) return "Creating billing portal...";
  if (failed) return "Billing portal failed";
  if (parsed) return "Billing portal ready";
  return "Billing portal";
}

export const ToolBillingPortal: Renderer = ({ part }) => {
  const running =
    part.state === "input-streaming" || part.state === "input-available";
  const failed = part.state === "output-error";
  const done = part.state === "output-available";
  const parsed = done
    ? parseCreateBillingPortalSessionOutput(part.output)
    : null;
  const rawText = done && !parsed ? extractMcpOutputText(part.output) : null;

  return (
    <ToolCard failed={failed}>
      <ToolCardHeader
        icon={<ExternalLinkIcon />}
        running={running}
        failed={failed}
        done={!!parsed}
        label={headerLabel(running, failed, parsed)}
      />

      {failed ? (
        <ToolCardFooterError text={String(part.errorText ?? "Unknown error")} />
      ) : null}
      {parsed ? (
        <ToolCardFooterSuccess href={parsed.url} label="Open billing portal" />
      ) : null}
      {rawText ? <ToolCardFooterRaw text={rawText} /> : null}
    </ToolCard>
  );
};

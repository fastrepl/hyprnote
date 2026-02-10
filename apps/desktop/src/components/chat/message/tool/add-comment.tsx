import { MessageSquareIcon } from "lucide-react";

import {
  extractMcpOutputText,
  parseAddCommentOutput,
} from "../../../../chat/support-mcp-tools";
import type { ToolRenderer } from "../types";
import {
  MarkdownPreview,
  ToolCard,
  ToolCardBody,
  ToolCardFooterError,
  ToolCardFooterRaw,
  ToolCardFooterSuccess,
  ToolCardHeader,
} from "./shared";

type Renderer = ToolRenderer<"tool-add_comment">;

function headerLabel(
  running: boolean,
  failed: boolean,
  issueNumber: string | number,
  parsed: ReturnType<typeof parseAddCommentOutput>,
): string {
  if (running) return `Commenting on #${issueNumber}...`;
  if (failed) return `Comment failed for #${issueNumber}`;
  if (parsed) return `Comment posted to #${issueNumber}`;
  return `Comment on #${issueNumber}`;
}

export const ToolAddComment: Renderer = ({ part }) => {
  const running =
    part.state === "input-streaming" || part.state === "input-available";
  const failed = part.state === "output-error";
  const done = part.state === "output-available";
  const parsed = done ? parseAddCommentOutput(part.output) : null;
  const rawText = done && !parsed ? extractMcpOutputText(part.output) : null;
  const issueNumber = part.input?.issue_number ?? "?";

  return (
    <ToolCard failed={failed}>
      <ToolCardHeader
        icon={<MessageSquareIcon />}
        running={running}
        failed={failed}
        done={!!parsed}
        label={headerLabel(running, failed, issueNumber, parsed)}
      />

      {part.input ? (
        <ToolCardBody>
          <p className="text-xs font-medium text-neutral-600">
            Issue #{part.input.issue_number}
          </p>
          {part.input.body ? (
            <MarkdownPreview>{part.input.body}</MarkdownPreview>
          ) : null}
        </ToolCardBody>
      ) : null}

      {failed ? (
        <ToolCardFooterError text={String(part.errorText ?? "Unknown error")} />
      ) : null}
      {parsed ? (
        <ToolCardFooterSuccess
          href={parsed.comment_url}
          label="Comment posted"
        />
      ) : null}
      {rawText ? <ToolCardFooterRaw text={rawText} /> : null}
    </ToolCard>
  );
};

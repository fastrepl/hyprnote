import type {
  AddCommentOutput,
  AddCommentParams,
  CreateBillingPortalSessionOutput,
  CreateBillingPortalSessionParams,
  CreateIssueOutput,
  CreateIssueParams,
  ListSubscriptionsParams,
  SearchIssueItem,
  SearchIssuesOutput,
  SearchIssuesParams,
  SubscriptionItem,
} from "@hypr/plugin-mcp";

export type McpTextContentOutput = {
  content: Array<{
    type: string;
    text?: string;
  }>;
};

export type SupportMcpTools = {
  create_issue: { input: CreateIssueParams; output: McpTextContentOutput };
  add_comment: { input: AddCommentParams; output: McpTextContentOutput };
  search_issues: { input: SearchIssuesParams; output: McpTextContentOutput };
  list_subscriptions: {
    input: ListSubscriptionsParams;
    output: McpTextContentOutput;
  };
  create_billing_portal_session: {
    input: CreateBillingPortalSessionParams;
    output: McpTextContentOutput;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readJsonText(output: unknown): unknown {
  if (!isRecord(output) || !Array.isArray(output.content)) {
    return null;
  }

  const texts = output.content
    .filter(
      (item): item is { type: string; text: string } =>
        isRecord(item) && item.type === "text" && typeof item.text === "string",
    )
    .map((item) => item.text)
    .join("\n");

  if (!texts) {
    return null;
  }

  try {
    return JSON.parse(texts);
  } catch {
    return null;
  }
}

export function extractMcpOutputText(output: unknown): string | null {
  if (!isRecord(output) || !Array.isArray(output.content)) {
    return null;
  }

  const text = output.content
    .filter(
      (item): item is { type: string; text: string } =>
        isRecord(item) && item.type === "text" && typeof item.text === "string",
    )
    .map((item) => item.text)
    .join("\n");

  return text || null;
}

function isSearchIssueItem(value: unknown): value is SearchIssueItem {
  return (
    isRecord(value) &&
    typeof value.number === "number" &&
    typeof value.title === "string" &&
    typeof value.state === "string" &&
    typeof value.url === "string" &&
    typeof value.created_at === "string" &&
    Array.isArray(value.labels) &&
    value.labels.every((label) => typeof label === "string")
  );
}

export function parseCreateIssueOutput(
  output: unknown,
): CreateIssueOutput | null {
  const value = readJsonText(output);
  if (
    isRecord(value) &&
    typeof value.success === "boolean" &&
    typeof value.issue_url === "string" &&
    typeof value.issue_number === "number"
  ) {
    return value as CreateIssueOutput;
  }
  return null;
}

export function parseAddCommentOutput(
  output: unknown,
): AddCommentOutput | null {
  const value = readJsonText(output);
  if (
    isRecord(value) &&
    typeof value.success === "boolean" &&
    typeof value.comment_url === "string"
  ) {
    return value as AddCommentOutput;
  }
  return null;
}

export function parseSearchIssuesOutput(
  output: unknown,
): SearchIssuesOutput | null {
  const value = readJsonText(output);
  if (
    isRecord(value) &&
    typeof value.total_results === "number" &&
    Array.isArray(value.issues) &&
    value.issues.every(isSearchIssueItem)
  ) {
    return value as SearchIssuesOutput;
  }
  return null;
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

function isSubscriptionItem(value: unknown): value is SubscriptionItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.status === "string" &&
    isNullableNumber(value.start_date) &&
    typeof value.cancel_at_period_end === "boolean" &&
    isNullableNumber(value.cancel_at) &&
    isNullableNumber(value.canceled_at) &&
    isNullableNumber(value.trial_start) &&
    isNullableNumber(value.trial_end)
  );
}

export function parseListSubscriptionsOutput(
  output: unknown,
): SubscriptionItem[] | null {
  const value = readJsonText(output);
  if (Array.isArray(value) && value.every(isSubscriptionItem)) {
    return value;
  }
  return null;
}

export function parseCreateBillingPortalSessionOutput(
  output: unknown,
): CreateBillingPortalSessionOutput | null {
  const value = readJsonText(output);
  if (isRecord(value) && typeof value.url === "string") {
    return value as CreateBillingPortalSessionOutput;
  }
  return null;
}

import type { Part } from "../types";
import { ToolAddComment } from "./add-comment";
import { ToolBillingPortal } from "./billing-portal";
import { ToolCreateIssue } from "./create-issue";
import { ToolGeneric } from "./generic";
import { ToolListSubscriptions } from "./list-subscriptions";
import { ToolSearchSessions } from "./search";
import { ToolSearchIssues } from "./search-issues";

export function Tool({ part }: { part: Record<string, unknown> }) {
  if (part.type === "tool-search_sessions") {
    return (
      <ToolSearchSessions
        part={part as Extract<Part, { type: "tool-search_sessions" }>}
      />
    );
  }
  if (part.type === "tool-create_issue") {
    return (
      <ToolCreateIssue
        part={part as Extract<Part, { type: "tool-create_issue" }>}
      />
    );
  }
  if (part.type === "tool-add_comment") {
    return (
      <ToolAddComment
        part={part as Extract<Part, { type: "tool-add_comment" }>}
      />
    );
  }
  if (part.type === "tool-search_issues") {
    return (
      <ToolSearchIssues
        part={part as Extract<Part, { type: "tool-search_issues" }>}
      />
    );
  }
  if (part.type === "tool-list_subscriptions") {
    return (
      <ToolListSubscriptions
        part={part as Extract<Part, { type: "tool-list_subscriptions" }>}
      />
    );
  }
  if (part.type === "tool-create_billing_portal_session") {
    return (
      <ToolBillingPortal
        part={
          part as Extract<Part, { type: "tool-create_billing_portal_session" }>
        }
      />
    );
  }
  return <ToolGeneric part={part} />;
}

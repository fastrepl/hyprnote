import type { ComponentType } from "react";

import type { Part, ToolRenderer } from "../types";
import { ToolAddComment } from "./add-comment";
import { ToolBillingPortal } from "./billing-portal";
import { ToolCreateIssue } from "./create-issue";
import { ToolGeneric } from "./generic";
import { ToolListSubscriptions } from "./list-subscriptions";
import { ToolSearchSessions } from "./search";
import { ToolSearchIssues } from "./search-issues";

const toolRegistry: Record<string, ComponentType<{ part: Extract<Part, { type: string }> }>> = {
  "tool-search_sessions": ToolSearchSessions as ToolRenderer,
  "tool-create_issue": ToolCreateIssue as ToolRenderer,
  "tool-add_comment": ToolAddComment as ToolRenderer,
  "tool-search_issues": ToolSearchIssues as ToolRenderer,
  "tool-list_subscriptions": ToolListSubscriptions as ToolRenderer,
  "tool-create_billing_portal_session": ToolBillingPortal as ToolRenderer,
};

export function Tool({ part }: { part: Part }) {
  const Renderer = toolRegistry[part.type];
  if (Renderer) {
    return <Renderer part={part as Extract<Part, { type: string }>} />;
  }
  return <ToolGeneric part={part as Record<string, unknown>} />;
}

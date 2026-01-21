import type { App } from "@slack/bolt";

import { registerAgentApprovalAction } from "./actions/agent-approval";
import { registerAgentMessage } from "./messages/agent";

export function registerListeners(app: App) {
  registerAgentApprovalAction(app);
  registerAgentMessage(app);
}

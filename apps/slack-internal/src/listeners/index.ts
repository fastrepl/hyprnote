import type { App } from "@slack/bolt";

import { registerAgentApprovalAction } from "./actions/agent-approval";
import { registerRunCodeAction } from "./actions/run-code";
import { registerAgentMessage } from "./messages/agent";
import { registerCodeBlockMessage } from "./messages/code-block";

export function registerListeners(app: App) {
  registerCodeBlockMessage(app);
  registerRunCodeAction(app);
  registerAgentApprovalAction(app);
  registerAgentMessage(app);
}

import type { App } from "@slack/bolt";

import { registerRunCodeAction } from "./actions/run-code";
import { registerExecuteCommand } from "./commands/execute";
import { registerCodeBlockMessage } from "./messages/code-block";

export function registerListeners(app: App) {
  registerExecuteCommand(app);
  registerCodeBlockMessage(app);
  registerRunCodeAction(app);
}

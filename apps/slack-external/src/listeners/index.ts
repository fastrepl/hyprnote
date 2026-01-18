import type { App } from "@slack/bolt";

import { registerHyprnoteCommand } from "./commands/hyprnote";

export function registerListeners(app: App) {
  registerHyprnoteCommand(app);
}

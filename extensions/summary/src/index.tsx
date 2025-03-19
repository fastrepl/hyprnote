import type { Extension } from "@hypr/extension-utils";
import { commands as templateCommands } from "@hypr/plugin-template";

import systemTemplate from "./system.jinja?raw";
import userTemplate from "./user.jinja?raw";

import Bullet, { TEMPLATE_LIVE_SUMMARY_SYSTEM, TEMPLATE_LIVE_SUMMARY_USER } from "./widgets/bullet";

export default {
  id: "@hypr/extension-summary",
  widgetGroups: [Bullet],
  init: async () => {
    await Promise.all([
      templateCommands.registerTemplate(
        TEMPLATE_LIVE_SUMMARY_USER,
        userTemplate,
      ),
      templateCommands.registerTemplate(
        TEMPLATE_LIVE_SUMMARY_SYSTEM,
        systemTemplate,
      ),
    ]);
  },
} satisfies Extension;

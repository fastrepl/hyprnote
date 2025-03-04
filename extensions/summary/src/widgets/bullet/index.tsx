import type { WidgetGroup } from "@hypr/extension-utils";
import { commands as templateCommands } from "@hypr/plugin-template";

import Widget2x2 from "./2x2";

import systemTemplate from "../../system.jinja?raw";
import userTemplate from "../../user.jinja?raw";

export const TEMPLATE_LIVE_SUMMARY_SYSTEM = "live-summary-system";
export const TEMPLATE_LIVE_SUMMARY_USER = "live-summary-user";

const widget: WidgetGroup = {
  id: "summary-bullet",
  items: [
    {
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
      type: "twoByTwo",
      component: Widget2x2,
    },
  ],
};

export default widget;

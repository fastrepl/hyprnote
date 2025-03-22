import type { WidgetGroup } from "@hypr/extension-utils";

import Widget2x2 from "./2x2";

export const TEMPLATE_LIVE_SUMMARY_SYSTEM = "live-summary-system";
export const TEMPLATE_LIVE_SUMMARY_USER = "live-summary-user";

export default {
  id: "bullet",
  items: [
    {
      type: "twoByTwo",
      component: Widget2x2,
    },
  ],
} satisfies WidgetGroup;

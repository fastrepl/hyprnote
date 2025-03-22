import { type WidgetGroup } from "@hypr/extension-utils";

import Widget2x1 from "./2x1";

export default {
  id: "timer-digits",
  items: [
    {
      type: "twoByOne",
      component: Widget2x1,
    },
  ],
} satisfies WidgetGroup;

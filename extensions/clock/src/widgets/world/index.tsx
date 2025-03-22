import type { WidgetGroup } from "@hypr/extension-utils";
import WorldClock2x2 from "./2x2";

const clockWorld: WidgetGroup = {
  id: "clock-world",
  items: [
    {
      type: "twoByTwo",
      component: WorldClock2x2,
    },
  ],
};

export default clockWorld;

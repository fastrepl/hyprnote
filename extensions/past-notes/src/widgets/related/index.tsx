import { WidgetGroup } from "@hypr/extension-utils";

import Widget2x2 from "./2x2";
import WidgetFull from "./full";

const widgetGroup: WidgetGroup = {
  id: "past-notes-related",
  items: [
    {
      init: async () => {},
      type: "twoByTwo",
      component: Widget2x2,
    },
    {
      init: async () => {},
      type: "full",
      component: WidgetFull,
    },
  ],
};

export default widgetGroup;

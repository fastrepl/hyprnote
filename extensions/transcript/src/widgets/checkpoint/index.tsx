import { WidgetGroup } from "@hypr/extension-utils";
import Widget2x2 from "./2x2";
import WidgetFull from "./full";

const widgetGroup: WidgetGroup = {
  id: "transcript-checkpoint",
  items: [
    {
      init: async () => {
        console.log("Transcript with Checkpoint 2x2 widget initialized");
      },
      type: "twoByTwo",
      component: Widget2x2,
    },
    {
      init: async () => {
        console.log("Transcript with Checkpoint Full widget initialized");
      },
      type: "full",
      component: WidgetFull,
    },
  ],
};

export default widgetGroup;

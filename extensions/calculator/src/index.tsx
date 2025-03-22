import type { Extension } from "@hypr/extension-utils";
import BasicCalculator from "./widgets/basic";

export default {
  id: "@hypr/extension-calculator",
  widgetGroups: [BasicCalculator],
  init: async () => {},
} satisfies Extension;

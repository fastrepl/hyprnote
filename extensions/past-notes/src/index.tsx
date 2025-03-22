import type { Extension } from "@hypr/extension-utils";
import RelatedPastNotes from "./widgets/related";

export default {
  id: "@hypr/extension-past-notes",
  widgetGroups: [RelatedPastNotes],
  init: async () => {},
} satisfies Extension;

import type { Extension } from "@hypr/extension-utils";
import NewTicketsSuggestion from "./widgets/new-tickets-suggestion";
import RelatedTickets from "./widgets/related-tickets";

export default {
  id: "@hypr/extension-linear",
  widgetGroups: [NewTicketsSuggestion, RelatedTickets],
  init: async () => {},
} satisfies Extension;

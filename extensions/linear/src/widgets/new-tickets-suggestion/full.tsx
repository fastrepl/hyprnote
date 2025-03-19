import { Minimize2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { type WidgetFullSize, WidgetFullSizeWrapper, WidgetHeader } from "@hypr/ui/components/ui/widgets";
import { mockNewTickets } from "../../mock";
import type { Ticket } from "../../type";
import TicketCard from "../components/ticket-card";

const NewTicketsSuggestionFull: WidgetFullSize = ({ onMinimize }) => {
  const [newTickets, _setNewTickets] = useState<Ticket[]>(mockNewTickets);

  return (
    <WidgetFullSizeWrapper onMinimize={onMinimize}>
      <div className="p-4 pb-0">
        <WidgetHeader
          title={
            <div className="flex items-center gap-2">
              <img
                src="../assets/linear-icon.png"
                className="size-5 rounded-md"
              />
              New Ticket Suggestion
            </div>
          }
          actions={[
            <Button
              key="minimize"
              variant="ghost"
              size="icon"
              onClick={onMinimize}
            >
              <Minimize2Icon className="h-4 w-4" />
            </Button>,
          ]}
        />
      </div>
      <div className="overflow-y-auto flex-1 p-4 pt-0 space-y-3">
        {newTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
      </div>
    </WidgetFullSizeWrapper>
  );
};

export default NewTicketsSuggestionFull;

import { Maximize2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { WidgetHeader, type WidgetTwoByTwo, WidgetTwoByTwoWrapper } from "@hypr/ui/components/ui/widgets";
import { mockRelatedTickets } from "../../mock";
import { Ticket } from "../../type";
import TicketCard from "../components/ticket-card";

const RelatedTickets2x2: WidgetTwoByTwo = ({ onMaximize }) => {
  const [relatedTickets, _setRelatedTickets] = useState<Ticket[]>(mockRelatedTickets);

  return (
    <WidgetTwoByTwoWrapper>
      <div className="p-4 pb-0">
        <WidgetHeader
          title={
            <div className="flex items-center gap-2">
              <img
                src="../assets/linear-icon.png"
                className="size-5 rounded-md"
              />
              Related Tickets
            </div>
          }
          actions={[
            <Button
              key="maximize"
              variant="ghost"
              size="icon"
              onClick={onMaximize}
              className="p-0"
            >
              <Maximize2Icon size={16} />
            </Button>,
          ]}
        />
      </div>
      <div className="overflow-y-auto flex-1 p-4 pt-0 space-y-3">
        {relatedTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
      </div>
    </WidgetTwoByTwoWrapper>
  );
};

export default RelatedTickets2x2;

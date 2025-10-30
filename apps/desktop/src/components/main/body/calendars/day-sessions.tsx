import { Button } from "@hypr/ui/components/ui/button";

import { StickyNote } from "lucide-react";

import * as main from "../../../../store/tinybase/main";
import { useTabs } from "../../../../store/zustand/tabs";

export function TabContentCalendarDaySessions({ sessionId }: { sessionId: string }) {
  const session = main.UI.useRow("sessions", sessionId, main.STORE_ID);
  const { openNew } = useTabs();

  const eventId = session?.event_id ?? "";
  const event = main.UI.useRow("events", eventId, main.STORE_ID);

  const handleClick = () => {
    openNew({ type: "sessions", id: sessionId });
  };

  return (
    <Button variant="ghost" className="w-full justify-start px-1 text-neutral-600 h-6" onClick={handleClick}>
      <StickyNote size={12} className="text-blue-600" />
      <p className="truncate">{event && eventId ? event.title : session?.title || "Untitled"}</p>
    </Button>
  );
}

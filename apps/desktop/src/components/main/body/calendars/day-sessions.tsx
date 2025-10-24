import { Button } from "@hypr/ui/components/ui/button";

import { StickyNote } from "lucide-react";

import * as persisted from "../../../../store/tinybase/persisted";
import { useTabs } from "../../../../store/zustand/tabs";

export function TabContentCalendarDaySessions({ sessionId }: { sessionId: string }) {
  const session = persisted.UI.useRow("sessions", sessionId, persisted.STORE_ID);
  const { openNew } = useTabs();

  const eventId = session?.event_id ?? "";
  const event = persisted.UI.useRow("events", eventId, persisted.STORE_ID);

  const handleClick = () => {
    openNew({ type: "sessions", id: sessionId, state: { editor: "raw" } });
  };

  return (
    <Button variant="ghost" className="w-full justify-start px-1 text-neutral-600 h-6" onClick={handleClick}>
      <StickyNote size={12} className="text-blue-600" />
      <p className="truncate">{event && eventId ? event.title : session?.title || "Untitled"}</p>
    </Button>
  );
}

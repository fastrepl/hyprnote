import { cn } from "@hypr/ui/lib/utils";

import * as persisted from "../../../../store/tinybase/persisted";
import { type Tab } from "../../../../store/zustand/tabs";

export function TitleInput({ tab }: { tab: Tab }) {
  if (tab.type !== "sessions") {
    return null;
  }

  const { id: sessionId, state: { editor } } = tab;
  const title = persisted.UI.useCell("sessions", sessionId, "title", persisted.STORE_ID);

  const handleEditTitle = persisted.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (title: string) => ({ title }),
    [],
    persisted.STORE_ID,
  );

  return (
    <input
      id={`title-input-${sessionId}-${editor}`}
      placeholder="Untitled"
      type="text"
      onChange={(e) => handleEditTitle(e.target.value)}
      value={title}
      className={cn(
        "w-full transition-opacity duration-200",
        "border-none bg-transparent focus:outline-none",
        "text-xl font-semibold placeholder:text-muted-foreground",
      )}
    />
  );
}

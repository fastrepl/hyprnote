import { cn } from "@hypr/utils";

import * as main from "../../../../store/tinybase/main";
import { type Tab } from "../../../../store/zustand/tabs";

export function TitleInput({
  tab,
}: {
  tab: Extract<Tab, { type: "sessions" }>;
}) {
  const {
    id: sessionId,
    state: { editor },
  } = tab;
  const title = main.UI.useCell("sessions", sessionId, "title", main.STORE_ID);

  const handleEditTitle = main.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (title: string) => ({ title }),
    [],
    main.STORE_ID,
  );

  return (
    <input
      id={`title-input-${sessionId}-${editor}`}
      placeholder="Untitled"
      type="text"
      onChange={(e) => handleEditTitle(e.target.value)}
      value={title ?? ""}
      className={cn(
        "w-full transition-opacity duration-200",
        "border-none bg-transparent focus:outline-none",
        "text-xl font-semibold placeholder:text-muted-foreground",
      )}
    />
  );
}

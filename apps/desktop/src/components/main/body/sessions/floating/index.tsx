import { type ReactNode } from "react";

import type { Tab } from "../../../../../store/zustand/tabs/schema";
import { useCurrentNoteTab, useHasTranscript } from "../shared";
import { ListenButton } from "./listen";

export function FloatingActionButton({
  tab,
}: {
  tab: Extract<Tab, { type: "sessions" }>;
}) {
  const currentTab = useCurrentNoteTab(tab);
  const hasTranscript = useHasTranscript(tab.id);

  if (!(currentTab.type === "raw" && !hasTranscript)) {
    return null;
  }

  return (
    <FloatingButtonContainer>
      <ListenButton tab={tab} />
    </FloatingButtonContainer>
  );
}

function FloatingButtonContainer({ children }: { children: ReactNode }) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
      {children}
    </div>
  );
}

import { type ReactNode } from "react";

import type { Tab } from "../../../../../store/zustand/tabs/schema";
import { useCurrentNoteTab, useHasTranscript } from "../shared";

import { ListenButton } from "./listen";

export function FloatingActionButton({ tab }: { tab: Extract<Tab, { type: "sessions" }> }) {
  const currentTab = useCurrentNoteTab(tab);
  const hasTranscript = useHasTranscript(tab.id);

  let button: ReactNode | null = null;

  if (currentTab === "raw" && !hasTranscript) {
    button = <ListenButton tab={tab} />;
  }

  if (!button) {
    return null;
  }

  return (
    <FloatingButtonContainer>
      {button}
    </FloatingButtonContainer>
  );
}

function FloatingButtonContainer({ children }: { children: ReactNode }) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
      {children}
    </div>
  );
}

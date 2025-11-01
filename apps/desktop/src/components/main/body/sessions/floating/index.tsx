import { type ReactNode } from "react";

import { TooltipProvider } from "@hypr/ui/components/ui/tooltip";
import type { Tab } from "../../../../../store/zustand/tabs/schema";
import { useCurrentNoteTab, useHasTranscript } from "../shared";

import { GenerateButton } from "./generate";
import { ListenButton } from "./listen";

export function FloatingActionButton({ tab }: { tab: Extract<Tab, { type: "sessions" }> }) {
  const currentTab = useCurrentNoteTab(tab);
  const hasTranscript = useHasTranscript(tab.id);

  let button: ReactNode | null = null;

  if (currentTab === "raw" && !hasTranscript) {
    button = <ListenButton tab={tab} />;
  } else if (currentTab === "enhanced") {
    button = <GenerateButton sessionId={tab.id} />;
  }

  if (!button) {
    return null;
  }

  return (
    <TooltipProvider>
      <FloatingButtonContainer>
        {button}
      </FloatingButtonContainer>
    </TooltipProvider>
  );
}

function FloatingButtonContainer({ children }: { children: ReactNode }) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
      {children}
    </div>
  );
}

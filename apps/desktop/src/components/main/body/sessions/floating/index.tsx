import type { ReactNode } from "react";

import { TooltipProvider } from "@hypr/ui/components/ui/tooltip";

import { useListener } from "../../../../../contexts/listener";
import type { Tab } from "../../../../../store/zustand/tabs/schema";

import { GenerateButton } from "./generate";
import { ListenButton } from "./listen";
import { PlaybackButton } from "./playback";

export function FloatingActionButton({ tab }: { tab: Extract<Tab, { type: "sessions" }> }) {
  const active = useListener((state) => state.status === "running_active");

  let button: ReactNode | null = null;

  if (active || tab.state.editor === "raw") {
    button = <ListenButton tab={tab} />;
  } else if (tab.state.editor === "enhanced") {
    button = <GenerateButton sessionId={tab.id} />;
  } else if (tab.state.editor === "transcript") {
    button = <PlaybackButton sessionId={tab.id} />;
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
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
      {children}
    </div>
  );
}

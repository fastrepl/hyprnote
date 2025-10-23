import type { ReactNode } from "react";

import { useListener } from "../../../../../contexts/listener";
import type { Tab } from "../../../../../store/zustand/tabs/schema";

import { GenerateButton } from "./generate";
import { ListenButton } from "./listen";
import { PlaybackButton } from "./playback";

export function FloatingActionButton({ tab }: { tab: Extract<Tab, { type: "sessions" }> }) {
  const active = useListener((state) => state.status === "running_active");

  if (active || tab.state.editor === "raw") {
    return (
      <FloatingButtonContainer>
        <ListenButton tab={tab} />
      </FloatingButtonContainer>
    );
  } else if (tab.state.editor === "enhanced") {
    return (
      <FloatingButtonContainer>
        <GenerateButton sessionId={tab.id} />
      </FloatingButtonContainer>
    );
  } else if (tab.state.editor === "transcript") {
    return (
      <FloatingButtonContainer>
        <PlaybackButton />
      </FloatingButtonContainer>
    );
  }
}

function FloatingButtonContainer({ children }: { children: ReactNode }) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
      {children}
    </div>
  );
}

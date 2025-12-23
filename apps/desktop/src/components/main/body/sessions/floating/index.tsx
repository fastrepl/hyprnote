import { type ReactNode } from "react";

import { cn } from "@hypr/utils";

import type { Tab } from "../../../../../store/zustand/tabs/schema";
import { useCaretPosition } from "../caret-position-context";
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
  const caretPosition = useCaretPosition();
  const isCaretNearBottom = caretPosition?.isCaretNearBottom ?? false;

  return (
    <div
      className={cn([
        "absolute left-1/2 -translate-x-1/2 z-50 flex items-center gap-3",
        "transition-all duration-200 ease-out",
        isCaretNearBottom ? "bottom-[-36px]" : "bottom-6",
      ])}
    >
      {children}
    </div>
  );
}

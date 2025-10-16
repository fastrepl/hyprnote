import type { Tab } from "../../../../../store/zustand/tabs/schema";

import { GenerateButton } from "./generate";
import { ListenButton } from "./listen";
import { PlaybackButton } from "./playback";

export function FloatingActionButton({ tab }: { tab: Extract<Tab, { type: "sessions" }> }) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
      {tab.state.editor === "raw" && <ListenButton tab={tab} />}
      {tab.state.editor === "enhanced" && <GenerateButton />}
      {tab.state.editor === "transcript" && <PlaybackButton />}
    </div>
  );
}

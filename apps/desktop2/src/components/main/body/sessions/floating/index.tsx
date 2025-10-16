import type { EditorView } from "../../../../../store/zustand/tabs/schema";

import { GenerateButton } from "./generate";
import { ListenButton } from "./listen";
import { PlaybackButton } from "./playback";

export function FloatingActionButton({ editorView }: { editorView: EditorView }) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
      {editorView === "raw" && <ListenButton />}
      {editorView === "enhanced" && <GenerateButton />}
      {editorView === "transcript" && <PlaybackButton />}
    </div>
  );
}

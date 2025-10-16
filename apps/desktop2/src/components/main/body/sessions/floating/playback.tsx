import { PlayIcon } from "lucide-react";

import { FloatingButton } from "./shared";

export function PlaybackButton() {
  return (
    <FloatingButton icon={<PlayIcon className="w-4 h-4" />}>
      Play recording
    </FloatingButton>
  );
}

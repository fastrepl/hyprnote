import { useEffect, useState } from "react";
import { Play, Pause } from "lucide-react";

import { commands as sfxCommands } from "@hypr/plugin-sfx";

export function PlayPauseButton() {
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (isPlaying) {
      sfxCommands.play("BGM");
    } else {
      sfxCommands.stop("BGM");
    }
  }, [isPlaying]);

  return (
    <button
      className="rounded-full p-2 transition-colors hover:bg-neutral-100"
      onClick={() => setIsPlaying(!isPlaying)}
    >
      {isPlaying ? (
        <Pause className="h-4 w-4 text-neutral-600" />
      ) : (
        <Play className="h-4 w-4 text-neutral-600" />
      )}
    </button>
  );
}

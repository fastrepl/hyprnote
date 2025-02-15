import { Play, Pause } from "lucide-react";
import { useState } from "react";

export function PlayPauseButton() {
  const [isPlaying, setIsPlaying] = useState(false);

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

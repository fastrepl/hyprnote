import { Pause, Play } from "lucide-react";

import { cn } from "@hypr/utils";

import { useAudioPlayer } from "./provider";

export function Timeline() {
  const { registerContainer, state, pause, resume, start, time } =
    useAudioPlayer();

  const handleClick = () => {
    if (state === "playing") {
      pause();
    } else if (state === "paused") {
      resume();
    } else if (state === "stopped") {
      start();
    }
  };

  return (
    <div className="w-full bg-neutral-50 rounded-xl">
      <div className={cn(["flex items-center gap-2 p-2", "w-full max-w-full"])}>
        <button
          onClick={handleClick}
          className={cn([
            "flex items-center justify-center",
            "w-8 h-8 rounded-full",
            "bg-white border border-neutral-200",
            "hover:bg-neutral-100 hover:scale-110 transition-all",
            "flex-shrink-0 shadow-sm",
          ])}
        >
          {state === "playing" ? (
            <Pause className="w-4 h-4 text-neutral-900" fill="currentColor" />
          ) : (
            <Play className="w-4 h-4 text-neutral-900" fill="currentColor" />
          )}
        </button>

        <div className="inline-flex gap-1 items-center text-xs text-neutral-600 flex-shrink-0 font-mono tabular-nums">
          <span>{formatTime(time.current)}</span>/
          <span>{formatTime(time.total)}</span>
        </div>

        <div
          ref={registerContainer}
          className="flex-1 min-w-0"
          style={{ minHeight: "30px", width: "100%" }}
        />
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

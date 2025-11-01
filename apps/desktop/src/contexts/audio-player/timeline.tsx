import { Pause, Play } from "lucide-react";

import { cn } from "@hypr/utils";
import { useAudioPlayer } from "./provider";

export function Timeline() {
  const { registerContainer, state, pause, resume, start } = useAudioPlayer();

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
    <div className={cn(["w-full", "bg-neutral-50 rounded-lg"])}>
      <div className={cn(["flex items-center gap-2.5", "px-4 py-2", "w-full max-w-full"])}>
        <button
          onClick={handleClick}
          className={cn([
            "flex items-center justify-center",
            "w-8 h-8 rounded-full",
            "bg-white border border-neutral-200",
            "hover:bg-neutral-100 transition-colors",
            "flex-shrink-0 shadow-sm",
          ])}
        >
          {state === "playing"
            ? <Pause className={cn(["w-4 h-4", "text-neutral-900"])} fill="currentColor" />
            : <Play className={cn(["w-4 h-4", "text-neutral-900"])} fill="currentColor" />}
        </button>

        <div ref={registerContainer} className={cn(["flex-1 min-w-0"])} style={{ minHeight: "30px", width: "100%" }} />
      </div>
    </div>
  );
}

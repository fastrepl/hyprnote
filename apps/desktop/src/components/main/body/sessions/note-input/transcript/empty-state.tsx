import { AudioLinesIcon } from "lucide-react";

export function TranscriptEmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-neutral-400">
      <AudioLinesIcon className="w-8 h-8" />
      <p className="text-sm">No transcript available</p>
    </div>
  );
}

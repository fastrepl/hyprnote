import { FileClock } from "lucide-react";

interface PastNotesChipProps {
  sessionId: string;
}

export function PastNotesChip({ sessionId }: PastNotesChipProps) {
  if (sessionId) {
    return null;
  }

  return (
    <button className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-zinc-800 flex-shrink-0 text-xs">
      <FileClock size={14} className="flex-shrink-0" />
      <span className="truncate">
        Past Notes
      </span>
    </button>
  );
}

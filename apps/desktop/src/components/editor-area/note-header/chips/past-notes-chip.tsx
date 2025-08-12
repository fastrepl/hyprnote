import { FileClock } from "lucide-react";

interface PastNotesChipProps {
  sessionId: string;
  isVeryNarrow?: boolean;
  isNarrow?: boolean;
}

export function PastNotesChip({ sessionId, isVeryNarrow = false, isNarrow = false }: PastNotesChipProps) {
  if (sessionId) {
    return null;
  }

  return (
    <button
      className={`flex flex-row items-center gap-2 rounded-md hover:bg-neutral-100 flex-shrink-0 text-xs ${
        isVeryNarrow ? "px-1.5 py-1" : "px-2 py-1.5"
      }`}
    >
      <FileClock size={14} className="flex-shrink-0" />
      {!isVeryNarrow && (
        <span className="truncate">
          {isNarrow ? "Past" : "Past Notes"}
        </span>
      )}
    </button>
  );
}

import { type Session } from "@hypr/plugin-db";
import { format } from "date-fns";

export function NoteItem({
  session,
  onSelect,
}: {
  session: Session;
  onSelect: () => void;
}) {
  const sessionDate = new Date(session.created_at);

  return (
    <button
      onClick={onSelect}
      className="hover:bg-neutral-100 bg-white group flex items-start gap-3 py-3 w-full text-left transition-all rounded-lg px-3 border border-neutral-200"
    >
      <div className="flex flex-col items-start gap-1">
        <div className="font-medium text-sm line-clamp-1 truncate">
          {session.title || "Untitled"}
        </div>
        <div className="text-xs text-neutral-500">
          {format(sessionDate, "M/d/yy")}
        </div>
      </div>
    </button>
  );
}

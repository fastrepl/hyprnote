import { type Session } from "@hypr/plugin-db";
import { parseFirstLine, formatRelativeDate } from "../../utils";

export default function Notes({ notes }: { notes: Session[] }) {
  if (!notes) {
    return null;
  }

  return (
    <div className="flex flex-col space-y-4">
      {notes.map((note, index) => (
        <div
          key={index}
          className="flex flex-col bg-white rounded-lg p-4 border border-neutral-200"
        >
          <h3 className="text-lg font-semibold mb-1">{note.title}</h3>
          <div className="flex gap-2">
            <div className="text-sm text-gray-500">
              {formatRelativeDate(new Date(note.timestamp))}
            </div>
            <div className="text-sm line-clamp-1 overflow-ellipsis flex-1">
              {parseFirstLine(note.enhanced_memo_html || note.raw_memo_html)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

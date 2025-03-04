import { TimelineView } from "@hypr/plugin-listener";
import { formatTime } from "../../utils";

export default function Transcript({
  transcript,
}: {
  transcript: TimelineView | null;
}) {
  if (!transcript) {
    return null;
  }

  return (
    <div className="flex flex-col space-y-4">
      {transcript.items.map((item, index) => (
        <div
          key={index}
          className="flex flex-col bg-white rounded-lg p-3 border border-neutral-200"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{item.speaker}</span>
            <span className="text-xs text-neutral-500">
              {formatTime(item.start)}~{formatTime(item.end)}
            </span>
          </div>
          <p className="text-sm mt-1">{item.text}</p>
        </div>
      ))}
    </div>
  );
}

import { AugmentedTimelineView } from "../../../mock";
import { formatTime } from "../../utils";

export default function Translation({
  translation,
}: {
  translation: AugmentedTimelineView | null;
}) {
  if (!translation) {
    return null;
  }

  return (
    <div className="flex flex-col space-y-4">
      {translation.items.map((item, index) => (
        <div
          key={index}
          className="flex flex-col bg-white rounded-lg p-3 shadow-sm border border-neutral-100"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{item.speaker}</span>
            <span className="text-xs text-neutral-500">
              {formatTime(item.start)}~{formatTime(item.end)}
            </span>
          </div>
          <p className="text-sm mt-1">{item.text}</p>
          <p className="text-xs mt-1 text-neutral-400 font-light">
            {item.originalText}
          </p>
        </div>
      ))}
    </div>
  );
}

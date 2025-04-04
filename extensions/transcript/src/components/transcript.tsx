import { EarIcon } from "lucide-react";
import { forwardRef } from "react";

import { TimelineView } from "@hypr/plugin-listener";
import { parseDialogue } from "../utils";

const Transcript = forwardRef<
  HTMLDivElement,
  {
    transcript: TimelineView | null;
    isLive: boolean;
  }
>(({ transcript, isLive }, ref) => {
  if (!transcript?.items) {
    return null;
  }

  return (
    <div ref={ref} className="flex-1 scrollbar-none px-4 flex flex-col gap-2 overflow-y-auto text-sm pb-4">
      {transcript?.items.map((item, index) => (
        <div
          key={index}
        >
          {parseDialogue(item.text).map((segment, segIndex) => (
            <p key={segIndex} className={segIndex > 0 ? "mt-1" : ""}>
              {segment.text}
            </p>
          ))}
        </div>
      ))}
      {isLive && (
        <div className="flex items-center gap-2 justify-center py-2 text-neutral-400">
          <EarIcon size={14} /> Listening... (there might be a delay)
        </div>
      )}
    </div>
  );
});

Transcript.displayName = "Transcript";

export default Transcript;

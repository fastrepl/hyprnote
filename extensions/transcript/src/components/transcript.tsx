import { TimelineView } from "@hypr/plugin-listener";
import { forwardRef } from "react";
import { parseDialogue } from "../utils";

const Transcript = forwardRef<
  HTMLDivElement,
  {
    transcript: TimelineView | null;
  }
>(({ transcript }, ref) => {
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
    </div>
  );
});

Transcript.displayName = "Transcript";

export default Transcript;

import { EarIcon } from "lucide-react";
import { forwardRef } from "react";

import { TimelineView } from "@hypr/plugin-listener";

const Transcript = forwardRef<
  HTMLDivElement,
  {
    transcript: TimelineView;
    isLive: boolean;
  }
>(({ transcript, isLive }, ref) => {
  return (
    <div
      ref={ref}
      className="flex-1 scrollbar-none px-4 flex flex-col gap-2 overflow-y-auto text-sm py-4"
    >
      {transcript.items.length > 0
        ? (
          transcript.items.map((item, index) => (
            <div key={index}>
              <p>{item.text}</p>
            </div>
          ))
        )
        : !isLive
        ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-neutral-400">Meeting is not active</p>
          </div>
        )
        : null}
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

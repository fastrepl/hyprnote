import { useState } from "react";
import { EventChip } from "./note-header/chips/event-chip";
import { ParticipantsChip } from "./note-header/chips/participants-chip";
import { TagChip } from "./note-header/chips/tag-chip";

interface MetadataModalProps {
  sessionId: string;
  children: React.ReactNode;
  hashtags?: string[];
}

export function MetadataModal({ sessionId, children, hashtags = [] }: MetadataModalProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative inline-block cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Keep original element visible with dynamic text color */}
      <div className={isHovered ? "[&_span]:text-neutral-600" : ""}>
        {children}
      </div>
      
      {/* Dark popover below the date */}
      {isHovered && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50">
          {/* Add invisible padding around the entire modal for easier hovering */}
          <div className="p-4 -m-4">
            {/* Arrow pointing up - seamlessly connected */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
              <div className="w-4 h-4 bg-white/90 border-l border-t border-neutral-200/50 rotate-45"></div>
            </div>
            
            {/* Light popover content */}
            <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-neutral-200/50 p-4 min-w-[300px] relative">
              <div className="flex flex-col gap-3">
                <div className="flex justify-start">
                  <EventChip sessionId={sessionId} />
                </div>
                <div className="flex justify-start">
                  <ParticipantsChip sessionId={sessionId} />
                </div>
                <div className="flex justify-start">
                  <TagChip sessionId={sessionId} hashtags={hashtags} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

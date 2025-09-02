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
      {/* Keep original element in layout to prevent shifts */}
      <div className={isHovered ? "opacity-0" : "opacity-100"}>
        {children}
      </div>
      
      {/* Expanded metadata view overlaid on top */}
      {isHovered && (
        <div className="absolute -top-px left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md shadow-lg border border-neutral-200/30 rounded-xl min-w-[320px] z-50">
          {/* Date at exact same position - reduced internal padding */}
          <div className="text-center px-2 pt-1 pb-1 mb-2 border-b border-neutral-100">
                         <span className="text-xs text-neutral-600 font-medium">
               Today, December 19, 2024
             </span>
          </div>
          
          {/* Metadata content that "expands" below */}
          <div className="px-4 pb-4 pt-2">
            <div className="flex flex-col gap-3">
              <div className="flex justify-center">
                <EventChip sessionId={sessionId} />
              </div>
              <div className="flex justify-center">
                <ParticipantsChip sessionId={sessionId} />
              </div>
              <div className="flex justify-center">
                <TagChip sessionId={sessionId} hashtags={hashtags} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

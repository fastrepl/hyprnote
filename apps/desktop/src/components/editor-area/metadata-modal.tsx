import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { EventChip } from "./note-header/chips/event-chip";
import { ParticipantsChip } from "./note-header/chips/participants-chip";
import { TagChip } from "./note-header/chips/tag-chip";

interface MetadataModalProps {
  sessionId: string;
  children: React.ReactNode;
  hashtags?: string[];
}

export function MetadataModal({ sessionId, children, hashtags = [] }: MetadataModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleMouseEnter = () => {
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div 
          className="cursor-pointer"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-4 shadow-lg border border-neutral-200" 
        align="center"
        sideOffset={0}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
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
      </PopoverContent>
    </Popover>
  );
}

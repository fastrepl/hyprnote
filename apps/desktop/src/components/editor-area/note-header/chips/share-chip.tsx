import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Share2, TextSelect } from "lucide-react";
import { useState } from "react";
import { SharePopoverContent, useShareLogic } from "../share-button-header";

interface ShareChipProps {
  isVeryNarrow?: boolean;
}

export function ShareChip({ isVeryNarrow = false }: ShareChipProps) {
  const [open, setOpen] = useState(false);
  const { hasEnhancedNote, handleOpenStateChange } = useShareLogic();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (hasEnhancedNote) {
      handleOpenStateChange(newOpen);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className={`flex flex-row items-center gap-1 rounded-md px-2 py-1.5 hover:bg-neutral-100 flex-shrink-0 text-xs transition-colors ${
            open ? "bg-neutral-100" : ""
          }`}
        >
          <Share2 size={14} className="flex-shrink-0" />
          {!isVeryNarrow && <span className="truncate">Share</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-3 focus:outline-none focus:ring-0 focus:ring-offset-0"
        align="start"
        sideOffset={7}
      >
        {hasEnhancedNote ? <SharePopoverContent /> : <SharePlaceholderContent />}
      </PopoverContent>
    </Popover>
  );
}

function SharePlaceholderContent() {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-medium text-neutral-700">Share Enhanced Note</div>
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
          <TextSelect size={24} className="text-neutral-400" />
        </div>
        <h3 className="text-sm font-medium text-neutral-900 mb-2">
          Enhanced Note Required
        </h3>
        <p className="text-xs text-neutral-500 leading-relaxed">
          Complete your meeting to generate an enhanced note, then share it via PDF, email, Obsidian, and more.
        </p>
      </div>
    </div>
  );
}

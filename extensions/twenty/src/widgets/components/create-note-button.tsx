import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";

interface CreateNoteButtonProps {
  handleCreateNote: () => void;
  isCreatingNote: boolean;
  isMeetingActive: boolean;
  selectedPeopleCount: number;
  isEnhanced: boolean;
}

export const CreateNoteButton = ({
  handleCreateNote,
  isCreatingNote,
  isMeetingActive,
  selectedPeopleCount,
  isEnhanced,
}: CreateNoteButtonProps) => {
  const isDisabled = selectedPeopleCount === 0
    || isCreatingNote
    || isMeetingActive
    || !isEnhanced;

  let tooltipContent = "";
  if (isCreatingNote) {
    tooltipContent = "Creating note in Twenty...";
  } else if (isMeetingActive) {
    tooltipContent = "You can create a note after the meeting is over";
  } else if (selectedPeopleCount === 0) {
    tooltipContent = "Select at least one participant";
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full">
            <Button
              onClick={handleCreateNote}
              disabled={isDisabled}
              className="w-full"
            >
              {isCreatingNote
                ? "Creating..."
                : `Upload ${isEnhanced ? "enhanced" : "raw"} note to Twenty`}
            </Button>
          </div>
        </TooltipTrigger>
        {isDisabled && (
          <TooltipContent>
            <p>{tooltipContent}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

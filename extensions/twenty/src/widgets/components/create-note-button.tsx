import { Button } from "@hypr/ui/components/ui/button";

interface CreateNoteButtonProps {
  handleCreateNote: () => void;
  isCreatingNote: boolean;
  isMeetingActive: boolean;
  selectedPeopleCount: number;
}

export const CreateNoteButton = ({
  handleCreateNote,
  isCreatingNote,
  isMeetingActive,
  selectedPeopleCount,
}: CreateNoteButtonProps) => {
  return (
    <Button
      onClick={handleCreateNote}
      disabled={selectedPeopleCount === 0 || isCreatingNote || isMeetingActive}
      className="w-full"
    >
      {isCreatingNote
        ? "Creating..."
        : isMeetingActive
        ? "You can create a note after meeting is over"
        : "Create Note in Twenty"}
    </Button>
  );
};

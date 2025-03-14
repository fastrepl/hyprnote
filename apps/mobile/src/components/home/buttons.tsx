import { Button } from "@hypr/ui/components/ui/button";
import { DancingSticks } from "@hypr/ui/components/ui/dancing-sticks";
import { EarIcon, SquarePenIcon } from "lucide-react";

interface CreateNoteButtonProps {
  onClick: () => void;
}

export function CreateNoteButton({ onClick }: CreateNoteButtonProps) {
  return (
    <Button
      className="w-full py-3 text-lg font-semibold inline-flex gap-2"
      onClick={onClick}
    >
      <SquarePenIcon size={20} />Create new note
    </Button>
  );
}

interface ReturnToNoteButtonProps {
  onClick?: () => void;
}

export function ReturnToNoteButton({ onClick }: ReturnToNoteButtonProps) {
  return (
    <Button
      className="w-full py-3 text-lg font-semibold inline-flex gap-2"
      onClick={onClick}
    >
      <EarIcon size={20} />Return to note<DancingSticks amplitude={0.5} />
    </Button>
  );
}

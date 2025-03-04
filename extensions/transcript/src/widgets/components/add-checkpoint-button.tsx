import { Button } from "@hypr/ui/components/ui/button";

interface AddCheckpointButtonProps {
  onClick?: () => void;
  disabled?: boolean;
}

export default function AddCheckpointButton({
  onClick,
  disabled,
}: AddCheckpointButtonProps) {
  return (
    <Button onClick={onClick} disabled={disabled}>
      {!disabled ? "Add Checkpoint" : "Meeting is over"}
    </Button>
  );
}

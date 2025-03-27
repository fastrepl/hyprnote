import { Button } from "@hypr/ui/components/ui/button";

import type { EditButtonProps } from "./types";

export function EditButton({ isEditing, setIsEditing, onSave }: EditButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        if (isEditing) {
          onSave();
        }
        setIsEditing(!isEditing);
      }}
    >
      {isEditing ? "Save" : "Edit"}
    </Button>
  );
}

import { Building, User } from "lucide-react";

interface EntityToolbarProps {
  title: string;
  isEditing?: boolean;
  onEditToggle?: () => void;
  entityType?: "human" | "organization";
}

export function EntityToolbar({ title, isEditing = false, onEditToggle, entityType }: EntityToolbarProps) {
  return (
    <header
      data-tauri-drag-region
      className="flex w-full items-center justify-between min-h-11 p-1 px-2 border-b border-transparent bg-transparent"
    >
      <div className="w-40 flex items-center justify-start" data-tauri-drag-region />
      <div className="flex-1 flex justify-center items-center gap-2" data-tauri-drag-region>
        {entityType === "human" && <User className="size-4 text-neutral-500" />}
        {entityType === "organization" && <Building className="size-4 text-neutral-500" />}
        <h1 className="font-medium truncate" data-tauri-drag-region>
          {title}
        </h1>
      </div>
      <div className="w-40 flex justify-end" data-tauri-drag-region>
        {onEditToggle && (
          <button
            onClick={onEditToggle}
            className="px-3 py-1 text-sm font-medium rounded-md bg-neutral-100 hover:bg-neutral-200 transition-colors"
          >
            {isEditing ? "Save" : "Edit"}
          </button>
        )}
      </div>
    </header>
  );
}

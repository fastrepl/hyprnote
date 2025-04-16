import { useCanGoBack, useRouter } from "@tanstack/react-router";

interface EntityToolbarProps {
  isEditing?: boolean;
  onEditToggle?: () => void;
}

export function EntityToolbar({
  isEditing = false,
  onEditToggle,
}: EntityToolbarProps) {
  const router = useRouter();
  const canGoBack = useCanGoBack();

  const handleClickBack = () => {
    if (canGoBack) {
      router.history.back();
    }
  };

  return (
    <header
      data-tauri-drag-region
      className="flex w-full items-center justify-between min-h-11 p-1 px-2 border-b border-transparent bg-transparent"
    >
      <div
        className="w-40 flex items-center justify-start pl-[72px]"
        data-tauri-drag-region
      >
        {canGoBack && (
          <button
            onClick={handleClickBack}
            className="px-3 py-1 text-sm font-medium rounded-md bg-neutral-100 hover:bg-neutral-200 transition-colors"
          >
            Back
          </button>
        )}
      </div>

      <div
        className="w-40 flex items-center justify-end gap-2"
        data-tauri-drag-region
      >
        {onEditToggle && (
          <button
            onClick={onEditToggle}
            className="px-3 py-1 text-sm font-medium rounded-md bg-neutral-100 hover:bg-neutral-200 transition-colors w-14"
          >
            {isEditing ? "Save" : "Edit"}
          </button>
        )}
      </div>
    </header>
  );
}

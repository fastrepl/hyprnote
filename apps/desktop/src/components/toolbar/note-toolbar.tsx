import { ShareButton } from "./buttons/share-button";

export function NoteToolbar() {
  return (
    <header
      data-tauri-drag-region
      className="flex w-full items-center justify-between min-h-11 p-1 px-2 border-b border-transparent bg-transparent"
    >
      <div className="w-40 flex items-center justify-start" data-tauri-drag-region />
      <div className="flex-1" data-tauri-drag-region />
      <div className="flex w-40 items-center justify-end" data-tauri-drag-region>
        <ShareButton />
      </div>
    </header>
  );
}

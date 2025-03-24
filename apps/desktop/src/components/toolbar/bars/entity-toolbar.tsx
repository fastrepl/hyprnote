interface EntityToolbarProps {
  title: string;
}

export function EntityToolbar({ title }: EntityToolbarProps) {
  return (
    <header
      data-tauri-drag-region
      className="flex w-full items-center justify-between min-h-11 p-1 px-2 border-b border-transparent bg-transparent"
    >
      <div className="w-40 flex items-center justify-start" data-tauri-drag-region />
      <div className="flex-1 flex justify-center" data-tauri-drag-region>
        <h1 className="font-medium" data-tauri-drag-region>
          {title}
        </h1>
      </div>
      <div className="w-40" data-tauri-drag-region />
    </header>
  );
}

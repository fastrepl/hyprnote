export function DefaultToolbar({ title }: { title?: string }) {
  return (
    <header
      data-tauri-drag-region
      className="flex w-full items-center justify-center h-11 p-1 px-2 border-b border-transparent bg-transparent"
    >
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
    </header>
  );
}

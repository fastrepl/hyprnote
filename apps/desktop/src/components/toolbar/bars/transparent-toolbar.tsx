export function TransparentToolbar() {
  return (
    <header
      data-tauri-drag-region
      className="flex w-full items-center justify-center h-11 p-1 px-2 border-b border-transparent bg-transparent"
    />
  );
}

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import clsx from "clsx";

export default function SearchBar() {
  const [_open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <button
        className={clsx([
          "w-[40%]",
          "flex flex-row items-center gap-2",
          "rounded-md border border-gray-200",
          "bg-gray-50 px-2 py-1.5",
        ])}
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-gray-500">Search</span>
        <Shortcut />
      </button>
    </>
  );
}

function Shortcut() {
  const isMac = true;
  return (
    <kbd className="pointer-events-none ml-auto inline-flex h-4 select-none items-center gap-1 rounded border border-gray-200 bg-gray-100 px-1.5 shadow-sm">
      <span className="text-xs text-gray-500">{isMac ? "⌘" : "Ctrl"}</span>
      <span className="text-[10px] text-gray-500">K</span>
    </kbd>
  );
}

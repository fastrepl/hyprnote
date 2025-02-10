import { SearchIcon } from "lucide-react";
import { useSearchStore } from "../../stores/use-search-store";
import { SearchCommandDialog } from "./search-command-dialog";

export function SearchIconButton() {
  const { isOpen, open, close } = useSearchStore();

  return (
    <>
      <button
        className="flex items-center justify-center rounded-md p-1 text-sm font-medium ring-offset-background transition-colors duration-200 hover:bg-neutral-200 sm:hidden"
        onClick={open}
      >
        <SearchIcon className="h-4 w-4" />
        <span className="sr-only">Search</span>
      </button>

      <SearchCommandDialog open={isOpen} onOpenChange={close} />
    </>
  );
}

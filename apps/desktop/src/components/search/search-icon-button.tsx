import { SearchIcon } from "lucide-react";
import { Button } from "@hypr/ui/components/ui/button";

import { useSearchStore } from "@/stores/use-search-store";

export function SearchIconButton() {
  const { open } = useSearchStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="hover:bg-neutral-200 sm:hidden"
      onClick={open}
      aria-label="Search"
    >
      <SearchIcon className="size-4" />
    </Button>
  );
}

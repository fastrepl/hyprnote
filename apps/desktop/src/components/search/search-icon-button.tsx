import { SearchIcon } from "lucide-react";
import { Button } from "@hypr/ui/components/ui/button";

import { cn } from "@/utils";
import { useSearchPalette } from "@/contexts/search-palette";

export function SearchIconButton({ isShown }: { isShown: boolean }) {
  const { open } = useSearchPalette();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("hover:bg-neutral-200", isShown ? "block" : "md:hidden")}
      onClick={open}
      aria-label="Search"
    >
      <SearchIcon className="size-4" />
    </Button>
  );
}

import { SearchIcon } from "lucide-react";
import { Button } from "@hypr/ui/components/ui/button";

import { useSearchStore } from "@/stores/use-search-store";
import { cn } from "@/utils";

export function SearchIconButton({ isShown }: { isShown: boolean }) {
  const { open } = useSearchStore();

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

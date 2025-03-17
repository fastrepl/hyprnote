import { useSearchPalette } from "@/contexts";
import { Button } from "@hypr/ui/components/ui/button";
import { SearchIcon } from "lucide-react";

export function SearchIconButton() {
  const { open } = useSearchPalette();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="hover:bg-neutral-200"
      onClick={open}
      aria-label="Search"
    >
      <SearchIcon className="size-4" />
    </Button>
  );
}

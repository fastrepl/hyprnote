import { Button } from "@hypr/ui/components/ui/button";
import { SearchIcon } from "lucide-react";

export function SearchIconButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="hover:bg-neutral-200 md:hidden block"
      aria-label="Search"
    >
      <SearchIcon className="size-4" />
    </Button>
  );
}

import { HomeIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@hypr/ui/components/ui/button";

export function HomeButton() {
  return (
    <Link to="/app/home">
      <Button
        variant="ghost"
        size="icon"
        className="hover:bg-neutral-200"
        aria-label="Go home"
      >
        <HomeIcon className="size-4" />
      </Button>
    </Link>
  );
}

import { MessageCircleMore } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/ui/lib/utils";

export function ChatPanelButton({ isExpanded, togglePanel }: { isExpanded: boolean; togglePanel: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "j" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        togglePanel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [togglePanel]);

  const handleClick = () => {
    togglePanel();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={cn("hover:bg-neutral-200 text-xs size-7 p-0", isExpanded && "bg-neutral-200")}
    >
      <MessageCircleMore className="w-4 h-4" />
    </Button>
  );
}

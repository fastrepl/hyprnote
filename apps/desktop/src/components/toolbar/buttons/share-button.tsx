import { ShareIcon } from "lucide-react";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@hypr/ui/components/ui/tooltip";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@hypr/ui/components/ui/popover";
import { useState } from "react";
import ShareAndPermissionPanel from "@/components/share-and-permission";

export function ShareButton() {
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);

  const currentUser = {
    name: "John Jeong",
    email: "john@fastrepl.com",
    avatarUrl: "",
  };

  const participants = [
    currentUser,
    {
      name: "Alice Smith",
      email: "alice@fastrepl.com",
      avatarUrl: "",
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <PopoverTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-neutral-200 dark:hover:bg-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100"
              aria-label="Share"
            >
              <ShareIcon className="size-4" />
            </Button>
          </TooltipTrigger>
        </PopoverTrigger>
        <TooltipContent>
          <p>Share</p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        className="w-80 p-0 overflow-clip focus:outline-none focus:ring-0 focus:ring-offset-0"
        align="end"
      >
        <ShareAndPermissionPanel
          email={email}
          setEmail={setEmail}
          currentUser={currentUser}
          participants={participants}
        />
      </PopoverContent>
    </Popover>
  );
}

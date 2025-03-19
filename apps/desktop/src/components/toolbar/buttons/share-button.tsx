import { Share2Icon } from "lucide-react";
import { useState } from "react";

import ShareAndPermissionPanel from "@/components/share-and-permission";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";

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
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-neutral-200"
          aria-label="Share"
        >
          <Share2Icon className="size-4" />
        </Button>
      </PopoverTrigger>
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

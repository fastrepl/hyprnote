import { ChevronRight, Users2Icon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { mockParticipants } from "@/mocks/participants";

export default function ParticipantsChip() {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Popover>
      <PopoverTrigger>
        <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100">
          <Users2Icon size={14} />
          {mockParticipants.length > 2 && (
            <span className="text-xs">
              {mockParticipants[0].full_name} +{mockParticipants.length - 1}
            </span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="p-0 shadow-lg" align="start">
        <div className="space-y-1">
          {mockParticipants.map((option) => (
            <button
              key={option.id}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-neutral-100"
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6" style={{ backgroundColor: "gray" }}>
                  <AvatarFallback className="text-xs">
                    {getInitials(option.full_name ?? "UNKNOWN")}
                  </AvatarFallback>
                </Avatar>
                <span>{option.full_name}</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

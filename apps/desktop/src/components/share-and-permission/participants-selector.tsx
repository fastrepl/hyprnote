import { Button } from "@hypr/ui/components/ui/button";
import { ChevronDown, ChevronRight, Users2Icon } from "lucide-react";
import { InvitedUser } from "./invited-user";

export interface ParticipantsSelectorProps {
  expanded: boolean;
  onToggle: () => void;
  participants: Array<{ name: string; email: string; avatarUrl: string }>;
}

export const ParticipantsSelector = ({
  expanded,
  onToggle,
  participants,
}: ParticipantsSelectorProps) => (
  <>
    <div
      className="flex items-center justify-between hover:bg-neutral-200  min-h-11 rounded-lg -mx-2 px-2 py-1 cursor-pointer"
      onClick={onToggle}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-lg bg-neutral-100   flex items-center justify-center">
          <Users2Icon className="size-4 text-neutral-600 " />
        </div>
        <div>
          <div className="text-sm font-medium">All Participants</div>
          <div className="text-xs text-neutral-600 ">
            Teamspace · {participants.length} people
          </div>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="hover:bg-transparent">
        {expanded ? (
          <ChevronDown className="size-4 text-neutral-600 " />
        ) : (
          <ChevronRight className="size-4 text-neutral-600 " />
        )}
      </Button>
    </div>
    {expanded && (
      <div className="pl-2 space-y-3">
        {participants.map((participant) => (
          <InvitedUser
            key={participant.email}
            {...participant}
            onRemove={() => {}}
          />
        ))}
      </div>
    )}
  </>
);

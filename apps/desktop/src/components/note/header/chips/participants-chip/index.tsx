import { useSession } from "@/contexts";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { Users2Icon } from "lucide-react";
import { ParticipantsList } from "./participants-list";

export function ParticipantsChip() {
  const sessionId = useSession((s) => s.session?.id);
  const participants = useQuery({
    enabled: !!sessionId,
    queryKey: ["participants", sessionId!],
    queryFn: () => dbCommands.sessionListParticipants(sessionId!),
  });

  return (
    <Popover>
      <PopoverTrigger>
        <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100 text-xs">
          <Users2Icon size={14} />
          {participants.data?.length && participants.data.length > 2 && (
            <div>
              {participants.data[0].full_name} +{participants.data.length - 1}
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="shadow-lg"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ParticipantsList participants={participants.data ?? []} sessionId={sessionId} />
      </PopoverContent>
    </Popover>
  );
}

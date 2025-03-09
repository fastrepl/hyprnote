import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RiLinkedinBoxFill } from "@remixicon/react";
import { Users2Icon, Mail } from "lucide-react";
import { toast } from "sonner";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@hypr/ui/components/ui/popover";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { useSession } from "@/contexts";

import { commands as dbCommands, type Human } from "@hypr/plugin-db";

export function ParticipantsChip() {
  const session = useSession((s) => s.session);
  const participants = useQuery({
    enabled: !!session?.id,
    queryKey: ["participants", session.id],
    queryFn: () => dbCommands.sessionListParticipants(session.id),
  });

  return (
    <Popover>
      <PopoverTrigger>
        <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 dark:hover:text-neutral-100 text-xs">
          <Users2Icon size={14} className="dark:text-neutral-100" />
          {participants.data?.length && participants.data.length > 2 && (
            <div className="dark:text-neutral-100">
              {participants.data[0].full_name} + {participants.data.length - 1}
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="shadow-lg dark:bg-neutral-800 dark:text-neutral-100"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ParticipantsList participants={participants.data ?? []} />
      </PopoverContent>
    </Popover>
  );
}

function ParticipantsList({ participants }: { participants: Human[] }) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const groupedParticipants = useMemo(() => {
    const groups: Record<string, Human[]> = {
      "No Organization": [],
    };

    participants.forEach((participant) => {
      const orgId = participant.organization_id || "No Organization";
      if (!groups[orgId]) {
        groups[orgId] = [];
      }
      groups[orgId].push(participant);
    });

    return groups;
  }, [participants]);

  return (
    <div className="space-y-2">
      {Object.entries(groupedParticipants).map(([orgId, members]) => (
        <div key={orgId} className="space-y-1">
          <div className="pb-1">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-300">
              {orgId === "No Organization" ? "Others" : orgId}
            </p>
          </div>
          <div className="space-y-0.5">
            {members.map((member) => (
              <div
                key={member.id}
                tabIndex={-1}
                className="flex w-full items-start justify-between rounded py-2 text-sm"
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar
                      className="size-6"
                      style={{ backgroundColor: "gray" }}
                    >
                      <AvatarFallback className="text-xs">
                        {getInitials(member.full_name ?? "UNKNOWN")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col">
                      <span className="font-medium dark:text-neutral-100">
                        {member.full_name}
                      </span>
                      {member.job_title && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-300">
                          {member.job_title}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!member.linkedin_username && (
                      <a
                        href={`https://linkedin.com/in/${member.linkedin_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-300 dark:hover:text-neutral-100"
                      >
                        <RiLinkedinBoxFill className="size-5" />
                      </a>
                    )}
                    {member.email && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await navigator.clipboard.writeText(member.email!);
                            toast.success("Email copied to clipboard");
                          } catch (err) {
                            toast.error("Failed to copy email");
                          }
                        }}
                        className="text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-300 dark:hover:text-neutral-100"
                        title={member.email}
                      >
                        <Mail className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

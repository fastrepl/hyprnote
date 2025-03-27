import { Trans, useLingui } from "@lingui/react/macro";
import { RiCornerDownLeftLine, RiLinkedinBoxFill } from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { CircleMinus, Mail, PlusIcon } from "lucide-react";
import { KeyboardEvent, useState } from "react";

import { commands as dbCommands, type Human } from "@hypr/plugin-db";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { getInitials } from "@hypr/utils";

interface ParticipantsListProps {
  sessionId: string;
}

export function ParticipantsList({ sessionId }: ParticipantsListProps) {
  const groupedParticipants = useQuery({
    queryKey: ["grouped-participants", sessionId],
    queryFn: async () => {
      const participants = await dbCommands.sessionListParticipants(sessionId);
      const ret: Record<string, Human[]> = {};

      participants.forEach((participant) => {
        const group = participant.organization_id ?? "";
        ret[group] = [...(ret[group] || []), participant];
      });

      return ret;
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-medium text-neutral-700">Participants</div>

      <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
        {Object.entries(groupedParticipants.data ?? {}).map(([orgId, members]) => (
          <OrganizationWithParticipants key={orgId} orgId={orgId} members={members} sessionId={sessionId} />
        ))}
      </div>

      <ParticipantAddControl sessionId={sessionId} />
    </div>
  );
}

function OrganizationWithParticipants(
  { orgId, members, sessionId }: { orgId: string; members: Human[]; sessionId: string },
) {
  const organization = useQuery({
    queryKey: ["organization", orgId],
    queryFn: () => dbCommands.getOrganization(orgId),
  });

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-xs font-medium text-neutral-400">
        {organization.data?.name ?? "No organization"}
      </div>
      <div className="flex flex-col rounded-md overflow-hidden bg-neutral-50 border border-neutral-100">
        {members.map((member, index) => (
          <ParticipentItem
            key={member.id}
            member={member}
            sessionId={sessionId}
            isLast={index === members.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function ParticipentItem({
  member,
  sessionId,
  isLast = false,
}: {
  member: Human;
  sessionId: string;
  isLast?: boolean;
}) {
  const queryClient = useQueryClient();

  const removeParticipantMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => dbCommands.sessionRemoveParticipant(sessionId, id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (query) => (query.queryKey[0] as string).includes("participants") && query.queryKey[1] === sessionId,
      }),
  });

  const handleClickHuman = (human: Human) => {
    windowsCommands.windowShow({ human: human.id });
  };

  const handleRemoveParticipant = (id: string) => {
    removeParticipantMutation.mutate({ id: id });
  };

  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-2 py-2 px-3",
        "hover:bg-neutral-100 cursor-pointer group transition-colors",
        !isLast && "border-b border-neutral-100",
      )}
      onClick={() => handleClickHuman(member)}
    >
      <div className="flex items-center gap-2.5 relative">
        <div className="relative size-7 flex items-center justify-center flex-shrink-0">
          <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity">
            <Avatar className="size-7">
              <AvatarFallback className="text-xs bg-neutral-200 text-neutral-700 font-medium">
                {member.full_name ? getInitials(member.full_name) : "?"}
              </AvatarFallback>
            </Avatar>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveParticipant(member.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemoveParticipant(member.id);
                  }
                }}
                className={clsx([
                  "flex items-center justify-center",
                  "text-red-400 hover:text-red-600",
                  "absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
                  "bg-white shadow-sm",
                ])}
              >
                <CircleMinus className="size-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={10}>
              <Trans>Remove {member.full_name} from list</Trans>
            </TooltipContent>
          </Tooltip>
        </div>
        <span className="text-sm font-medium text-neutral-700">
          {member.full_name}
        </span>
      </div>

      <div className="flex items-center gap-2 transition-colors">
        {member.email && (
          <a
            href={`mailto:${member.email}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 transition-colors hover:text-neutral-600 p-1 rounded-full hover:bg-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="size-3.5" />
          </a>
        )}
        {member.linkedin_username && (
          <a
            href={`https://linkedin.com/in/${member.linkedin_username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 transition-colors hover:text-neutral-600 p-1 rounded-full hover:bg-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <RiLinkedinBoxFill className="size-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function ParticipantAddControl({ sessionId }: { sessionId: string }) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [newParticipantInput, setNewParticipantInput] = useState("");

  const addParticipantMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const newParticipant: Human = {
        id: crypto.randomUUID(),
        full_name: name,
        organization_id: null,
        is_user: false,
        email: null,
        job_title: null,
        linkedin_username: null,
      };

      await dbCommands.upsertHuman(newParticipant);
      await dbCommands.sessionAddParticipant(sessionId, newParticipant.id);
    },
    onError: console.error,
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (query) => (query.queryKey[0] as string).includes("participants") && query.queryKey[1] === sessionId,
      }),
  });

  const handleAddParticipants = () => {
    const name = newParticipantInput.trim();
    if (name === "") {
      return;
    }

    addParticipantMutation.mutate({ name });
    setNewParticipantInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddParticipants();
    }
  };

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <div className="flex items-center w-full px-2 py-1.5 gap-2 rounded bg-neutral-50 border border-neutral-200">
        <span className="text-neutral-500 flex-shrink-0">
          <PlusIcon className="size-4" />
        </span>
        <input
          type="text"
          value={newParticipantInput}
          onChange={(e) => setNewParticipantInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t`Add participant`}
          className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-400"
        />
        {newParticipantInput.trim() && (
          <button
            onClick={handleAddParticipants}
            className="text-neutral-500 hover:text-neutral-700 transition-colors flex-shrink-0"
            aria-label="Add participant"
          >
            <RiCornerDownLeftLine className="size-4" />
          </button>
        )}
      </div>
      <ParticipantCandidates query={newParticipantInput} sessionId={sessionId} />
    </div>
  );
}

function ParticipantCandidates({ query, sessionId }: { query: string; sessionId: string }) {
  const queryClient = useQueryClient();

  const participants = useQuery({
    queryKey: ["search-participants", query],
    queryFn: async () => {
      const humans = await dbCommands.listHumans({ search: [4, query] });
      const participants = await dbCommands.sessionListParticipants(sessionId);
      return humans.filter((human) => !participants.some((participant) => participant.id === human.id));
    },
  });

  const addParticipantMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => dbCommands.sessionAddParticipant(sessionId, id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (query) => (query.queryKey[0] as string).includes("participants") && query.queryKey[1] === sessionId,
      }),
  });

  const handleClick = (id: string) => {
    addParticipantMutation.mutate({ id });
  };

  if (!query.trim() || !participants.data?.length) {
    return null;
  }

  return (
    <div className="flex flex-col w-full rounded border border-neutral-200 overflow-hidden">
      {participants.data?.map((participant) => (
        <button
          className="flex items-center px-3 py-2 text-sm text-left hover:bg-neutral-100 transition-colors w-full"
          key={participant.id}
          onClick={() => handleClick(participant.id)}
        >
          <span className="flex-shrink-0 size-5 flex items-center justify-center mr-2 bg-neutral-100 rounded-full">
            <span className="text-xs">{participant.full_name ? getInitials(participant.full_name) : "?"}</span>
          </span>
          {participant.full_name}
        </button>
      ))}
    </div>
  );
}

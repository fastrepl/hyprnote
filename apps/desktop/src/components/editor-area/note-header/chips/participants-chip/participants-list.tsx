import { Trans, useLingui } from "@lingui/react/macro";
import { RiCornerDownLeftLine, RiLinkedinBoxFill } from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleMinus, Mail, PlusIcon } from "lucide-react";
import { KeyboardEvent, useState } from "react";

import { commands as dbCommands, type Human } from "@hypr/plugin-db";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { getInitials } from "@hypr/utils";
import clsx from "clsx";

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
    <div className="flex flex-col gap-2">
      <div className="text-xs font-medium">Participants</div>

      <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
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
    <div>
      <div className="text-xs text-neutral-400 mt-2 mb-1">
        {organization.data?.name ?? "No organization"}
      </div>
      {members.map((member) => <ParticipentItem key={member.id} member={member} sessionId={sessionId} />)}
    </div>
  );
}

function ParticipentItem({ member, sessionId }: { member: Human; sessionId: string }) {
  const queryClient = useQueryClient();

  const removeParticipantMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => dbCommands.sessionRemoveParticipant(sessionId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["grouped-participants", sessionId] }),
  });

  const handleClickHuman = (human: Human) => {
    windowsCommands.windowShow({ human: human.id });
  };

  const handleRemoveParticipant = (id: string) => {
    removeParticipantMutation.mutate({ id: id });
  };

  return (
    <div
      className="flex items-center justify-between gap-2 py-1 px-1 rounded group hover:bg-neutral-100 cursor-pointer"
      onClick={() => handleClickHuman(member)}
    >
      <div className="flex items-center gap-2 relative">
        <div className="relative size-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity">
            <Avatar className="size-6">
              <AvatarFallback className="text-xs">
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
        <span className="text-sm">
          {member.full_name}
        </span>
      </div>

      <div className="flex items-center gap-1 transition-colors">
        {member.email && (
          <a
            href={`mailto:${member.email}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 transition-colors hover:text-neutral-600"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="size-4" />
          </a>
        )}
        {member.linkedin_username && (
          <a
            href={`https://linkedin.com/in/${member.linkedin_username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 transition-colors hover:text-neutral-600"
            onClick={(e) => e.stopPropagation()}
          >
            <RiLinkedinBoxFill className="size-4" />
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["grouped-participants", sessionId] }),
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
    <div className="flex items-center gap-2 border-t border-border pt-4">
      <div className="flex items-center flex-1 gap-1">
        <span className="text-neutral-500">
          <PlusIcon className="size-4" />
        </span>
        <input
          type="text"
          value={newParticipantInput}
          onChange={(e) => setNewParticipantInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t`Add participant`}
          className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-500"
        />
        {newParticipantInput.trim() !== "" && (
          <button
            onClick={handleAddParticipants}
            className="text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            <RiCornerDownLeftLine className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

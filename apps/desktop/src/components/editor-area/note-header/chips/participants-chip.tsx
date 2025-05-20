import { Trans, useLingui } from "@lingui/react/macro";
import { RiCornerDownLeftLine, RiLinkedinBoxFill } from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { CircleMinus, MailIcon, SearchIcon, Users2Icon } from "lucide-react";
import React, { useMemo, useState } from "react";

import { useHypr } from "@/contexts/hypr";
import { commands as dbCommands, type Human } from "@hypr/plugin-db";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { getInitials } from "@hypr/utils";

const NO_ORGANIZATION_ID = "__NO_ORGANIZATION__";

export function ParticipantsChip({ sessionId }: { sessionId: string }) {
  const { userId } = useHypr();

  const { data: participants = [] } = useQuery({
    queryKey: ["participants", sessionId],
    queryFn: async () => {
      const participants = await dbCommands.sessionListParticipants(sessionId);
      const orgs = await Promise.all(
        participants
          .map((p) => p.organization_id)
          .filter((id) => id !== null)
          .map((id) => dbCommands.getOrganization(id)),
      ).then((orgs) => orgs.filter((o) => o !== null));

      const grouped = participants.reduce((acc, participant) => {
        const orgId = participant.organization_id ?? NO_ORGANIZATION_ID;
        acc[orgId] = [...(acc[orgId] || []), participant];
        return acc;
      }, {} as Record<string, Human[]>);

      return Object.entries(grouped).map(([orgId, participants]) => ({
        organization: orgs.find((o) => o.id === orgId) ?? null,
        participants,
      })).sort((a, b) => {
        if (!a.organization && b.organization) {
          return 1;
        }
        if (a.organization && !b.organization) {
          return -1;
        }
        return (a.organization?.name || "").localeCompare(b.organization?.name || "");
      });
    },
  });

  const count = participants.reduce((acc, group) => acc + (group.participants?.length ?? 0), 0);
  const buttonText = useMemo(() => {
    if (count === 0) {
      return "Add participants";
    }

    const previewHuman = participants.find((group) => group.participants.length > 0)?.participants[0]!;
    if (previewHuman.id === userId && !previewHuman.full_name) {
      return "You";
    }
    return previewHuman.full_name ?? "??";
  }, [participants, userId]);

  return (
    <Popover>
      <PopoverTrigger>
        <div className="flex flex-row items-center gap-1 rounded-md px-2 py-1.5 hover:bg-neutral-100 text-xs">
          <Users2Icon size={14} />
          <span>{buttonText}</span>
          {count > 1 && <span className="text-neutral-400">+ {count - 1}</span>}
        </div>
      </PopoverTrigger>

      <PopoverContent className="shadow-lg w-80" align="start">
        {!participants.length
          ? <ParticipantAddControl sessionId={sessionId} />
          : (
            <div className="flex flex-col gap-3">
              <div className="text-sm font-medium text-neutral-700">Participants</div>
              <div className="flex flex-col gap-4 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1">
                {participants.map(({ organization, participants }) => (
                  <div className="flex flex-col gap-1.5">
                    <div className="text-xs font-medium text-neutral-400 truncate">
                      {organization?.name ?? "No organization"}
                    </div>
                    <div className="flex flex-col rounded-md overflow-hidden bg-neutral-50 border border-neutral-100">
                      {participants.map((member, index) => (
                        <ParticipentItem
                          key={member.id}
                          member={member}
                          sessionId={sessionId}
                          isLast={index === participants.length - 1}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <ParticipantAddControl sessionId={sessionId} />
            </div>
          )}
      </PopoverContent>
    </Popover>
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
  const { userId } = useHypr();

  const removeParticipantMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => dbCommands.sessionRemoveParticipant(sessionId, id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (query) => (query.queryKey[0] as string).includes("participants") && query.queryKey[1] === sessionId,
      }),
  });

  const handleClickHuman = (human: Human) => {
    windowsCommands.windowShow({ type: "human", value: human.id });
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
      <div className="flex items-center gap-2.5 relative min-w-0">
        <div className="relative size-7 flex items-center justify-center flex-shrink-0">
          <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity">
            <Avatar className="size-7">
              <AvatarFallback className="text-xs bg-neutral-200 text-neutral-700 font-medium">
                {member.full_name ? getInitials(member.full_name) : "?"}
              </AvatarFallback>
            </Avatar>
          </div>
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
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          {member.full_name
            ? (
              <span className="text-sm font-medium text-neutral-700 truncate">
                {member.full_name ?? "???"}
              </span>
            )
            : (
              <span className="text-sm font-medium text-neutral-400">
                {member.id === userId ? "You" : "Unknown"}
              </span>
            )}
          {member.job_title && (
            <span className="text-xs text-neutral-400 truncate">
              {member.job_title}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 transition-colors flex-shrink-0">
        {member.email && (
          <a
            href={`mailto:${member.email}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 transition-colors hover:text-neutral-600 p-1 rounded-full hover:bg-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <MailIcon className="size-3.5" />
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

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const name = newParticipantInput.trim();
    if (name === "") {
      return;
    }

    addParticipantMutation.mutate({ name });
    setNewParticipantInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const name = newParticipantInput.trim();
      if (name === "") {
        return;
      }

      addParticipantMutation.mutate({ name });
      setNewParticipantInput("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center w-full px-2 py-1.5 gap-2 rounded bg-neutral-50 border border-neutral-200">
          <span className="text-neutral-500 flex-shrink-0">
            <SearchIcon className="size-4" />
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
              type="submit"
              className="text-neutral-500 hover:text-neutral-700 transition-colors flex-shrink-0"
              aria-label="Add participant"
            >
              <RiCornerDownLeftLine className="size-4" />
            </button>
          )}
        </div>
        <ParticipantCandidates
          query={newParticipantInput}
          sessionId={sessionId}
          onMutation={() => setNewParticipantInput("")}
        />
      </div>
    </form>
  );
}

function ParticipantCandidates(
  { query, sessionId, onMutation }: { query: string; sessionId: string; onMutation: () => void },
) {
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
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (query) => (query.queryKey[0] as string).includes("participants") && query.queryKey[1] === sessionId,
      }),
  });

  const handleClick = () => {
    addParticipantMutation.mutate({ name: query.trim() });
    onMutation();
  };

  if (!query.trim()) {
    return null;
  }

  return (
    <div className="flex flex-col w-full rounded border border-neutral-200 overflow-hidden">
      {participants.data?.map((participant) => (
        <ParticipantCandidate
          key={participant.id}
          participant={participant}
          sessionId={sessionId}
          onMutation={onMutation}
        />
      ))}

      {(!participants.data || participants.data.length === 0) && (
        <button
          type="button"
          className="flex items-center px-3 py-2 text-sm text-left hover:bg-neutral-100 transition-colors w-full"
          onClick={handleClick}
        >
          <span className="flex-shrink-0 size-5 flex items-center justify-center mr-2 bg-neutral-200 rounded-full">
            <span className="text-xs">+</span>
          </span>
          <span className="flex items-center gap-1 font-medium text-neutral-600">
            <Trans>Create</Trans>
            <span className="text-neutral-900 truncate max-w-[140px]">&quot;{query.trim()}&quot;</span>
          </span>
        </button>
      )}
    </div>
  );
}

function ParticipantCandidate(
  { participant, sessionId, onMutation }: { participant: Human; sessionId: string; onMutation: () => void },
) {
  const queryClient = useQueryClient();

  const organization = useQuery({
    queryKey: ["org", participant.organization_id],
    queryFn: () => participant.organization_id ? dbCommands.getOrganization(participant.organization_id) : null,
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
    onMutation();
  };

  return (
    <button
      type="button"
      className="flex items-center px-3 py-2 text-sm text-left hover:bg-neutral-100 transition-colors w-full"
      key={participant.id}
      onClick={() => handleClick(participant.id)}
    >
      <span className="flex-shrink-0 size-5 flex items-center justify-center mr-2 bg-neutral-100 rounded-full">
        <span className="text-xs">{participant.full_name ? getInitials(participant.full_name) : "?"}</span>
      </span>
      <span className="font-medium truncate max-w-[180px]">{participant.full_name}</span>

      <div className="flex gap-0 items-center justify-between flex-1 min-w-0">
        {organization.data?.name && (
          <span className="text-xs text-neutral-400 ml-auto truncate max-w-[110px]">
            {[participant.job_title, organization.data.name].filter(Boolean).join(", ")}
          </span>
        )}
      </div>
    </button>
  );
}

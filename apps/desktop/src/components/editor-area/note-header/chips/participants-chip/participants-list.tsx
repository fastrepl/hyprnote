import { Trans, useLingui } from "@lingui/react/macro";
import { RiCornerDownLeftLine, RiLinkedinBoxFill } from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleMinus, Mail, PenIcon, PlusIcon } from "lucide-react";
import { KeyboardEvent, useMemo, useState } from "react";

import { type Human, type Organization } from "@hypr/plugin-db";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { getInitials } from "@hypr/utils";
import { EditParticipantForm } from "./edit-participant-form";

interface ParticipantsListProps {
  participants: Human[];
  sessionId?: string;
}

export function ParticipantsList({ participants, sessionId }: ParticipantsListProps) {
  const [newParticipantInput, setNewParticipantInput] = useState("");
  const queryClient = useQueryClient();
  const { t } = useLingui();

  const [localParticipants, setLocalParticipants] = useState<Human[]>(participants);
  const [locallyAddedIds, setLocallyAddedIds] = useState<Set<string>>(new Set());
  const [editedParticipantIds, setEditedParticipantIds] = useState<Set<string>>(new Set());
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  useMemo(() => {
    setLocalParticipants(participants);
  }, [participants]);

  const groupedParticipants = useMemo(() => {
    const groups: Record<string, Human[]> = {
      "No Organization": [],
    };

    localParticipants.forEach((participant) => {
      const orgId = participant.organization_id || "No Organization";
      if (!groups[orgId]) {
        groups[orgId] = [];
      }
      groups[orgId].push(participant);
    });

    return groups;
  }, [localParticipants]);

  const organizationIds = useMemo(() => {
    return Object.keys(groupedParticipants).filter(id => id !== "No Organization");
  }, [groupedParticipants]);

  const { data: organizationsMap } = useQuery({
    queryKey: ["organizations", organizationIds],
    queryFn: async () => {
      if (organizationIds.length === 0) return {};

      const organizations = await Promise.all(
        organizationIds.map(id => dbCommands.getOrganization(id).catch(() => null)),
      );

      return organizations.reduce((acc, org, index) => {
        if (org) {
          acc[organizationIds[index]] = org;
        }
        return acc;
      }, {} as Record<string, Organization>);
    },
    enabled: organizationIds.length > 0,
  });

  const addParticipantMutation = useMutation({
    mutationFn: async (name: string) => {
      const newParticipant: Human = {
        id: `temp-${Date.now()}`,
        full_name: name,
        organization_id: "No Organization",
        is_user: false,
        email: null,
        job_title: null,
        linkedin_username: null,
      };

      return newParticipant;
    },
    onSuccess: (newParticipant) => {
      setLocalParticipants((prev) => [...prev, newParticipant]);
      setLocallyAddedIds((prev) => new Set(prev).add(newParticipant.id));
      queryClient.setQueryData(
        ["participants", sessionId!],
        (oldData: Human[] | undefined) => oldData ? [...oldData, newParticipant] : [newParticipant],
      );
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async (participantId: string) => {
      return participantId;
    },
    onSuccess: (participantId) => {
      setLocalParticipants((prev) => prev.filter((p) => p.id !== participantId));
      queryClient.setQueryData(
        ["participants", sessionId!],
        (oldData: Human[] | undefined) => oldData ? oldData.filter(p => p.id !== participantId) : [],
      );
    },
  });

  const handleAddParticipants = async () => {
    if (!sessionId || !newParticipantInput.trim()) return;

    await addParticipantMutation.mutateAsync(newParticipantInput.trim());
    setNewParticipantInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddParticipants();
    }
  };

  const handleParticipantEdited = (participantId: string) => {
    setEditedParticipantIds(prev => {
      const newSet = new Set(prev);
      newSet.add(participantId);
      return newSet;
    });

    const updatedParticipants = queryClient.getQueryData<Human[]>(["participants", sessionId!]);
    const updatedParticipant = updatedParticipants?.find(p => p.id === participantId);

    if (updatedParticipant) {
      setLocalParticipants(prev => prev.map(p => p.id === participantId ? updatedParticipant : p));
    }
  };

  const handleClickHuman = (human: Human) => {
    windowsCommands.windowShow({ human: human.id });
  };

  const handleRemoveParticipant = (e: React.MouseEvent, participantId: string) => {
    e.stopPropagation();
    removeParticipantMutation.mutateAsync(participantId);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-medium">Participants</div>
      <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
        {Object.entries(groupedParticipants).map(([orgId, members]) => (
          <div key={orgId}>
            {orgId !== "No Organization" && (
              <div className="text-xs text-neutral-400 mt-2 mb-1">
                {organizationsMap?.[orgId]?.name || orgId}
              </div>
            )}
            {members.map((member) => (
              <div
                key={member.id}
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
                      <TooltipTrigger>
                        <button
                          onClick={(e) => handleRemoveParticipant(e, member.id)}
                          className="absolute inset-0 flex items-center justify-center rounded-full text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                        >
                          <CircleMinus className="size-4" />
                        </button>
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

                  {locallyAddedIds.has(member.id) && !editedParticipantIds.has(member.id) && (
                    <Popover
                      open={openPopoverId === member.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setOpenPopoverId(member.id);
                        } else {
                          setOpenPopoverId(null);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="text-neutral-400 transition-colors hover:text-neutral-600"
                        >
                          <PenIcon className="size-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-4">
                        <EditParticipantForm
                          participant={member}
                          onClose={() => setOpenPopoverId(null)}
                          sessionId={sessionId}
                          onParticipantEdited={handleParticipantEdited}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

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
    </div>
  );
}

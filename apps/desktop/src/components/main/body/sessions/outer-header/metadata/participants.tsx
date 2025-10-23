import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@hypr/ui/components/ui/hover-card";
import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { CheckIcon, MailIcon, MinusCircleIcon, SearchIcon, XIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { useQuery } from "../../../../../../hooks/useQuery";
import * as internal from "../../../../../../store/tinybase/internal";
import * as persisted from "../../../../../../store/tinybase/persisted";
import { useTabs } from "../../../../../../store/zustand/tabs";
import { getInitials } from "../../../contacts/shared";

interface MeetingParticipant {
  id: string;
  full_name?: string | null;
  email?: string | null;
  job_title?: string | null;
  linkedin_username?: string | null;
  organization?: {
    id: string;
    name: string;
  } | null;
}

interface ParticipantChipProps {
  participant: MeetingParticipant;
  currentUserId?: string;
  attended?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

function ParticipantChip({ participant, currentUserId, attended = true, onRemove }: ParticipantChipProps) {
  const displayName = participant.full_name
    || (participant.id === currentUserId ? "You" : "Unknown");

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <div className="group inline-flex items-center gap-1.5 px-1 py-0.5 bg-neutral-200 rounded-md hover:bg-neutral-200 transition-colors cursor-pointer">
          <p className="text-[12px] font-medium text-neutral-700 max-w-[120px] truncate hover:underline hover:decoration-dotted">
            {displayName}
          </p>

          <div className="flex items-center">
            <div className="group-hover:hidden">
              {attended
                ? <CheckIcon className="size-3.5 text-green-600" />
                : <XIcon className="size-3.5 text-red-500" />}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove?.();
              }}
              className="hidden group-hover:block text-neutral-500 hover:text-red-600 transition-colors"
            >
              <MinusCircleIcon className="size-3.5" />
            </button>
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" side="top">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Avatar className="size-12">
              <AvatarFallback className="text-sm bg-neutral-200 text-neutral-700 font-medium">
                {participant.full_name ? getInitials(participant.full_name) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="font-semibold text-sm">{displayName}</div>
              {participant.job_title && <div className="text-xs text-neutral-600">{participant.job_title}</div>}
              {participant.organization?.name && (
                <div className="text-xs text-neutral-500">{participant.organization.name}</div>
              )}
            </div>
          </div>
          {(participant.email || participant.linkedin_username) && (
            <div className="flex flex-col gap-2 pt-2 border-t border-neutral-200">
              {participant.email && (
                <a
                  href={`mailto:${participant.email}`}
                  className="flex items-center gap-2 text-xs text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  <MailIcon className="size-3.5" />
                  {participant.email}
                </a>
              )}
              {participant.linkedin_username && (
                <a
                  href={`https://linkedin.com/in/${participant.linkedin_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  <Icon icon="logos:linkedin-icon" className="size-3.5" />
                  linkedin.com/in/{participant.linkedin_username}
                </a>
              )}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function MeetingParticipants({ sessionId }: { sessionId: string }) {
  const [participantSearchQuery, setParticipantSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { openNew } = useTabs();
  const { user_id } = internal.UI.useValues(internal.STORE_ID);

  const store = persisted.UI.useStore(persisted.STORE_ID);
  const indexes = persisted.UI.useIndexes(persisted.STORE_ID);

  const participantMappingIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.sessionParticipantsBySession,
    sessionId,
    persisted.STORE_ID,
  );

  // Get participants with full data
  const participants: MeetingParticipant[] = useMemo(() => {
    const result: MeetingParticipant[] = [];
    if (store && participantMappingIds) {
      participantMappingIds.forEach((mappingId) => {
        const humanId = store.getCell("mapping_session_participant", mappingId, "human_id") as
          | string
          | undefined;
        if (humanId) {
          const humanRow = store.getRow("humans", humanId);
          if (humanRow) {
            const orgId = humanRow.org_id as string | undefined;
            const org = orgId ? store.getRow("organizations", orgId) : null;

            result.push({
              id: humanId,
              full_name: humanRow.name as string | null,
              email: humanRow.email as string | null,
              job_title: humanRow.job_title as string | null,
              linkedin_username: humanRow.linkedin_username as string | null,
              organization: org && orgId
                ? { id: orgId, name: org.name as string }
                : null,
            });
          }
        }
      });
    }
    return result;
  }, [store, participantMappingIds]);

  // TODO - sort participants based on attendance
  const sortedParticipants = participants;

  const participantSearch = useQuery({
    enabled: !!store && !!indexes && !!participantSearchQuery.trim(),
    deps: [store, indexes, participantSearchQuery, sessionId] as const,
    queryFn: async (store, indexes, query, sessionId) => {
      const results: MeetingParticipant[] = [];
      const existingParticipantIds = new Set<string>();

      const participantMappings = indexes!.getSliceRowIds(
        persisted.INDEXES.sessionParticipantsBySession,
        sessionId,
      );
      participantMappings?.forEach((mappingId: string) => {
        const humanId = store!.getCell(
          "mapping_session_participant",
          mappingId,
          "human_id",
        ) as string | undefined;
        if (humanId) {
          existingParticipantIds.add(humanId);
        }
      });

      const normalizedQuery = query.toLowerCase();

      store!.forEachRow("humans", (rowId, forEachCell) => {
        if (existingParticipantIds.has(rowId)) {
          return;
        }

        let name: string | undefined;
        let email: string | undefined;
        let job_title: string | undefined;
        let linkedin_username: string | undefined;
        let org_id: string | undefined;

        forEachCell((cellId, cell) => {
          if (cellId === "name") {
            name = cell as string;
          } else if (cellId === "email") {
            email = cell as string;
          } else if (cellId === "job_title") {
            job_title = cell as string;
          } else if (cellId === "linkedin_username") {
            linkedin_username = cell as string;
          } else if (cellId === "org_id") {
            org_id = cell as string;
          }
        });

        if (
          name && !name.toLowerCase().includes(normalizedQuery)
          && (!email || !email.toLowerCase().includes(normalizedQuery))
        ) {
          return;
        }

        const org = org_id ? store!.getRow("organizations", org_id) : null;

        results.push({
          id: rowId,
          full_name: name || null,
          email: email || null,
          job_title: job_title || null,
          linkedin_username: linkedin_username || null,
          organization: org
            ? {
              id: org_id!,
              name: org.name as string,
            }
            : null,
        });
      });

      return results.slice(0, 10);
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !participantSearchQuery && sortedParticipants.length > 0) {
      e.preventDefault();
      handleParticipantRemove(sortedParticipants[sortedParticipants.length - 1].id);
      return;
    }

    if (!participantSearchQuery.trim() || (participantSearch.data?.length ?? 0) === 0) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < (participantSearch.data?.length ?? 0) - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && participantSearch.data && selectedIndex < participantSearch.data.length) {
        handleSelectParticipant(participantSearch.data[selectedIndex].id);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsFocused(false);
      setParticipantSearchQuery("");
    }
  };

  const handleSelectParticipant = (participantId: string) => {
    handleParticipantAdd(participantId);
    setParticipantSearchQuery("");
    setSelectedIndex(-1);
    setIsFocused(true);
  };

  const handleParticipantClick = useCallback((participant: MeetingParticipant) => {
    openNew({
      type: "contacts",
      state: {
        selectedPerson: participant.id,
        selectedOrganization: null,
      },
    });
  }, [openNew]);

  const handleParticipantAdd = useCallback((participantId: string) => {
    if (!store) {
      return;
    }

    const mappingId = crypto.randomUUID();

    store.setRow("mapping_session_participant", mappingId, {
      user_id,
      session_id: sessionId,
      human_id: participantId,
      created_at: new Date().toISOString(),
    });

    setParticipantSearchQuery("");
  }, [store, sessionId, user_id]);

  const handleParticipantRemove = useCallback((participantId: string) => {
    if (!store || !participantMappingIds) {
      return;
    }

    const mappingId = participantMappingIds.find((id) => {
      const humanId = store.getCell("mapping_session_participant", id, "human_id");
      return humanId === participantId;
    });

    if (mappingId) {
      store.delRow("mapping_session_participant", mappingId);
    }
  }, [store, participantMappingIds]);

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-medium text-neutral-500">Participants</div>
      <div className="relative">
        <div
          className={cn(
            "flex flex-wrap items-center w-full px-2 py-1.5 gap-1.5 rounded bg-neutral-50 border border-neutral-200 focus-within:border-neutral-300 min-h-[36px]",
            isFocused && "border-neutral-300",
          )}
          onClick={() => document.getElementById("participant-search-input")?.focus()}
        >
          {sortedParticipants.map((participant) => (
            <ParticipantChip
              key={participant.id}
              participant={participant}
              currentUserId={user_id}
              onClick={() => handleParticipantClick(participant)}
              onRemove={() => handleParticipantRemove(participant.id)}
            />
          ))}
          {sortedParticipants.length === 0 && <SearchIcon className="size-4 text-neutral-700 flex-shrink-0" />}
          <input
            id="participant-search-input"
            type="text"
            value={participantSearchQuery}
            onChange={(e) => {
              setParticipantSearchQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setTimeout(() => setIsFocused(false), 200);
            }}
            placeholder={sortedParticipants.length === 0 ? "Add participant" : ""}
            className="flex-1 min-w-[120px] bg-transparent text-sm focus:outline-none placeholder:text-neutral-500"
          />
        </div>

        {isFocused && participantSearchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 flex flex-col w-full rounded border border-neutral-200 overflow-hidden bg-white shadow-md z-10 max-h-60 overflow-y-auto">
            {participantSearch.data && participantSearch.data.length > 0
              ? (
                participantSearch.data.map((participant, index) => (
                  <button
                    key={participant.id}
                    type="button"
                    onClick={() => handleSelectParticipant(participant.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 text-sm text-left transition-colors w-full",
                      selectedIndex === index ? "bg-neutral-200" : "hover:bg-neutral-100",
                    )}
                  >
                    <span className="font-medium truncate">{participant.full_name || "Unknown"}</span>
                    {participant.organization?.name && (
                      <span className="text-xs text-neutral-500 ml-2 flex-shrink-0">
                        {participant.organization.name}
                      </span>
                    )}
                  </button>
                ))
              )
              : (
                <div className="px-3 py-2 text-sm text-neutral-500 text-center">
                  No matching participants found
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

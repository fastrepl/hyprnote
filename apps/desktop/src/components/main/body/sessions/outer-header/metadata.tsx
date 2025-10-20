import { LinkedInIcon } from "@hypr/ui/components/icons/linkedin";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { cn, formatDateRange, getMeetingDomain } from "@hypr/utils";

import {
  CalendarIcon,
  CircleMinus,
  CornerDownLeft,
  ExternalLinkIcon,
  MailIcon,
  MapPinIcon,
  SearchIcon,
  VideoIcon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { useQuery } from "../../../../../hooks/useQuery";
import * as internal from "../../../../../store/tinybase/internal";
import * as persisted from "../../../../../store/tinybase/persisted";
import { useTabs } from "../../../../../store/zustand/tabs";

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

interface MeetingMetadata {
  id: string;
  title: string;
  started_at: string;
  ended_at: string;
  location?: string | null;
  meeting_link?: string | null;
  description?: string | null;
  participants: MeetingParticipant[];
}

interface ParticipantChipProps {
  participant: MeetingParticipant;
  currentUserId?: string;
  onClick?: () => void;
  onRemove?: () => void;
}

function ParticipantChip({ participant, currentUserId, onClick, onRemove }: ParticipantChipProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = participant.full_name
    || (participant.id === currentUserId ? "You" : "Unknown");

  return (
    <div className="group relative inline-flex items-center gap-2 px-3 py-2 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors w-full">
      <div className="flex flex-1 items-center gap-2 cursor-pointer" onClick={onClick}>
        <Avatar className="size-7">
          <AvatarFallback className="text-xs bg-neutral-200 text-neutral-700 font-medium">
            {participant.full_name ? getInitials(participant.full_name) : "?"}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-neutral-700 max-w-[140px] truncate">
          {displayName}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {participant.email && (
          <a
            href={`mailto:${participant.email}`}
            onClick={(e) => e.stopPropagation()}
            className="text-neutral-500 transition-colors hover:text-neutral-700 opacity-0 group-hover:opacity-100"
          >
            <MailIcon className="size-4" />
          </a>
        )}
        {participant.linkedin_username && (
          <a
            href={`https://linkedin.com/in/${participant.linkedin_username}`}
            onClick={(e) => e.stopPropagation()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-500 transition-colors hover:text-neutral-700 opacity-0 group-hover:opacity-100"
          >
            <LinkedInIcon className="size-4" />
          </a>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
        >
          <CircleMinus className="size-4" />
        </button>
      </div>
    </div>
  );
}

interface ParticipantsSectionProps {
  participants: MeetingParticipant[];
  searchQuery: string;
  searchResults: MeetingParticipant[];
  onSearchChange?: (query: string) => void;
  onParticipantAdd?: (participantId: string) => void;
  onParticipantClick?: (participant: MeetingParticipant) => void;
  onParticipantRemove?: (participantId: string) => void;
  currentUserId?: string;
}

function ParticipantsSection({
  participants,
  searchQuery,
  searchResults,
  onSearchChange,
  onParticipantAdd,
  onParticipantClick,
  onParticipantRemove,
  currentUserId,
}: ParticipantsSectionProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchQuery.trim() || searchResults.length === 0) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        handleSelectParticipant(searchResults[selectedIndex].id);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsFocused(false);
      onSearchChange?.("");
    }
  };

  const handleSelectParticipant = (participantId: string) => {
    onParticipantAdd?.(participantId);
    onSearchChange?.("");
    setSelectedIndex(-1);
    setIsFocused(true);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-medium text-neutral-500">Participants</div>
      {participants.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {participants.map((participant) => (
            <ParticipantChip
              key={participant.id}
              participant={participant}
              currentUserId={currentUserId}
              onClick={() => onParticipantClick?.(participant)}
              onRemove={() => onParticipantRemove?.(participant.id)}
            />
          ))}
        </div>
      )}

      <div className="relative">
        <div className="flex items-center w-full px-2 py-1.5 gap-2 rounded bg-neutral-50 border border-neutral-200 focus-within:border-neutral-300">
          <SearchIcon className="size-4 text-neutral-700 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange?.(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setTimeout(() => setIsFocused(false), 200);
            }}
            placeholder="Add participant"
            className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-500"
          />
          {searchQuery.trim() && (
            <button
              onClick={() => {
                if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
                  handleSelectParticipant(searchResults[selectedIndex].id);
                }
              }}
              className="text-neutral-700 transition-colors flex-shrink-0"
            >
              <CornerDownLeft className="size-4" />
            </button>
          )}
        </div>

        {isFocused && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 flex flex-col w-full rounded border border-neutral-200 overflow-hidden bg-white shadow-md z-10 max-h-60 overflow-y-auto">
            {searchResults.length > 0
              ? (
                searchResults.map((participant, index) => (
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

export function SessionMetadata({
  sessionId,
  currentUserId,
}: {
  sessionId: string;
  currentUserId: string | undefined;
}) {
  const [participantSearchQuery, setParticipantSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { openNew } = useTabs();
  const { user_id } = internal.UI.useValues(internal.STORE_ID);

  const store = persisted.UI.useStore(persisted.STORE_ID);
  const indexes = persisted.UI.useIndexes(persisted.STORE_ID);

  const sessionRow = persisted.UI.useRow("sessions", sessionId, persisted.STORE_ID);

  const eventRow = persisted.UI.useRow(
    "events",
    sessionRow.event_id || "dummy-event-id",
    persisted.STORE_ID,
  );

  const participantMappingIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.sessionParticipantsBySession,
    sessionId,
    persisted.STORE_ID,
  );

  const meetingMetadata: MeetingMetadata | null = useMemo(() => {
    if (!sessionRow.event_id || !eventRow || !eventRow.started_at || !eventRow.ended_at) {
      return null;
    }

    const participants: MeetingParticipant[] = [];
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

            participants.push({
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

    return {
      id: sessionRow.event_id,
      title: eventRow.title ?? "Untitled Event",
      started_at: eventRow.started_at,
      ended_at: eventRow.ended_at,
      location: (eventRow.location as string | undefined) ?? null,
      meeting_link: (eventRow.meeting_link as string | undefined) ?? null,
      description: (eventRow.description as string | undefined) ?? null,
      participants,
    };
  }, [sessionRow.event_id, eventRow, store, participantMappingIds]);

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

  const handleJoinMeeting = useCallback((meetingLink: string) => {
    window.open(meetingLink, "_blank");
  }, []);

  const handleParticipantClick = useCallback((participant: MeetingParticipant) => {
    openNew({
      type: "contacts",
      active: true,
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

  if (!meetingMetadata) {
    return (
      <Button
        disabled
        size="sm"
        variant="ghost"
      >
        <CalendarIcon size={14} className="shrink-0" />
        No event
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          className="max-w-28 text-neutral-700"
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          title={meetingMetadata.title}
        >
          <CalendarIcon size={16} className="shrink-0" />
          <p className="overflow-ellipsis truncate">{meetingMetadata.title}</p>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="shadow-lg w-72 relative">
        <div className="flex flex-col gap-3">
          <div className="font-semibold text-base">{meetingMetadata.title}</div>

          <div className="border-t border-neutral-200" />

          {meetingMetadata.location && (
            <>
              <div className="flex items-center gap-2">
                <MapPinIcon size={16} className="flex-shrink-0 text-neutral-700" />
                <span className="text-sm text-neutral-700 truncate">
                  {meetingMetadata.location}
                </span>
              </div>
              <div className="border-t border-neutral-200" />
            </>
          )}

          {meetingMetadata.meeting_link && (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <VideoIcon size={16} className="flex-shrink-0 text-neutral-700" />
                  <span className="text-sm text-neutral-700 truncate">
                    {getMeetingDomain(meetingMetadata.meeting_link)}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleJoinMeeting(meetingMetadata.meeting_link!)}
                  className="flex-shrink-0 gap-1"
                >
                  Join
                  <ExternalLinkIcon size={14} />
                </Button>
              </div>
              <div className="border-t border-neutral-200" />
            </>
          )}

          <p className="text-sm text-neutral-700">
            {formatDateRange(meetingMetadata.started_at, meetingMetadata.ended_at)}
          </p>

          <div className="border-t border-neutral-200" />

          <ParticipantsSection
            participants={meetingMetadata.participants}
            searchQuery={participantSearchQuery}
            searchResults={participantSearch.data ?? []}
            onSearchChange={setParticipantSearchQuery}
            onParticipantAdd={handleParticipantAdd}
            onParticipantClick={handleParticipantClick}
            onParticipantRemove={handleParticipantRemove}
            currentUserId={currentUserId}
          />

          {meetingMetadata.description && (
            <>
              <div className="border-t border-neutral-200" />
              <div className="text-sm text-neutral-700 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                {meetingMetadata.description}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

import { openUrl } from "@tauri-apps/plugin-opener";
import { CalendarIcon, ChevronDownIcon, CopyIcon, ExternalLinkIcon, MapPinIcon, VideoIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { formatDateRange, getMeetingDomain } from "@hypr/utils";
import { useQuery } from "../../../../../../hooks/useQuery";
import * as internal from "../../../../../../store/tinybase/internal";
import * as persisted from "../../../../../../store/tinybase/persisted";
import { useTabs } from "../../../../../../store/zustand/tabs";
import { MeetingMetadata, MeetingParticipant, ParticipantsSection } from "./others";

export function SessionMetadata({ sessionId }: { sessionId: string }) {
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
    openUrl(meetingLink);
  }, []);

  const handleCopyLink = useCallback((meetingLink: string) => {
    navigator.clipboard.writeText(meetingLink);
  }, []);

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
          <CalendarIcon size={14} className="shrink-0" />
          <p className="truncate">{meetingMetadata.title}</p>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="shadow-lg w-[340px] relative p-0 max-h-[80vh] flex flex-col">
        <div className="flex flex-col gap-3 overflow-y-auto p-4">
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="shrink-0">
                      <VideoIcon size={16} />
                      {getMeetingDomain(meetingMetadata.meeting_link)}
                      <ChevronDownIcon size={16} className="text-neutral-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => handleJoinMeeting(meetingMetadata.meeting_link!)}>
                      <ExternalLinkIcon size={14} className="mr-2" />
                      Open link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCopyLink(meetingMetadata.meeting_link!)}>
                      <CopyIcon size={14} className="mr-2" />
                      Copy link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  size="sm"
                  onClick={() => handleJoinMeeting(meetingMetadata.meeting_link!)}
                  className="flex-shrink-0 gap-1"
                >
                  Join
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
          />

          {meetingMetadata.description && (
            <>
              <div className="border-t border-neutral-200" />
              <div className="text-sm text-neutral-700 whitespace-pre-wrap break-words">
                {meetingMetadata.description}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

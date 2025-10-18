import {
  MeetingMetadata,
  MeetingMetadataChip,
  MeetingParticipant,
} from "@hypr/ui/components/block/meeting-metadata-chip";

import { useCallback, useMemo, useState } from "react";

import { useQuery } from "../../../../../hooks/useQuery";
import * as internal from "../../../../../store/tinybase/internal";
import * as persisted from "../../../../../store/tinybase/persisted";
import { useTabs } from "../../../../../store/zustand/tabs";

export function SessionMetadata({
  sessionId,
  currentUserId,
}: {
  sessionId: string;
  currentUserId: string | undefined;
}) {
  const [participantSearchQuery, setParticipantSearchQuery] = useState("");
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
      location: null, // TODO: Add location field to event schema
      meeting_link: null, // TODO: Add meeting_link field to event schema
      description: null, // TODO: Add description field to event schema
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

  return (
    <MeetingMetadataChip
      metadata={meetingMetadata}
      currentUserId={currentUserId}
      onJoinMeeting={handleJoinMeeting}
      onParticipantClick={handleParticipantClick}
      onParticipantAdd={handleParticipantAdd}
      onParticipantRemove={handleParticipantRemove}
      participantSearchQuery={participantSearchQuery}
      onParticipantSearchChange={setParticipantSearchQuery}
      participantSearchResults={participantSearch.data ?? []}
    />
  );
}

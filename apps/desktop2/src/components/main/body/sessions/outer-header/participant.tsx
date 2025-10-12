import { useCallback, useMemo, useState } from "react";

import { Participant, ParticipantGroup, ParticipantsChip } from "@hypr/ui/components/block/participants-chip";
import { useQuery } from "../../../../../hooks/useQuery";
import * as persisted from "../../../../../store/tinybase/persisted";
import { useTabs } from "../../../../../store/zustand/tabs";

export function SessionParticipants({
  sessionId,
  currentUserId,
}: {
  sessionId: string;
  currentUserId: string | undefined;
}) {
  const [participantSearchQuery, setParticipantSearchQuery] = useState("");
  const { openNew } = useTabs();
  const store = persisted.UI.useStore(persisted.STORE_ID);
  const indexes = persisted.UI.useIndexes(persisted.STORE_ID);

  const participantMappingIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.sessionParticipantsBySession,
    sessionId,
    persisted.STORE_ID,
  );

  const orgSliceIds = persisted.UI.useSliceIds(
    persisted.INDEXES.humansByOrg,
    persisted.STORE_ID,
  );

  const participantGroups = useSessionParticipantGroups(sessionId, participantMappingIds, orgSliceIds);

  const participantSearch = useQuery({
    enabled: !!store && !!indexes && !!participantSearchQuery.trim(),
    deps: [store, indexes, participantSearchQuery, sessionId] as const,
    queryFn: async (store, indexes, query, sessionId) => {
      const results: Participant[] = [];
      const existingParticipantIds = new Set<string>();

      const participantMappings = indexes!.getSliceRowIds(
        persisted.INDEXES.sessionParticipantsBySession,
        sessionId,
      );
      participantMappings?.forEach((mappingId: string) => {
        const humanId = store!.getCell("mapping_session_participant", mappingId, "human_id") as string | undefined;
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

  const handleRemove = useCallback((participantId: string) => {
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

  const handleSelect = useCallback((participantId: string) => {
    if (!store) {
      return;
    }

    const mappingId = crypto.randomUUID();
    const userId = store.getCell("configs", "singleton", "user_id") as string;

    store.setRow("mapping_session_participant", mappingId, {
      user_id: userId,
      session_id: sessionId,
      human_id: participantId,
      created_at: new Date().toISOString(),
    });

    setParticipantSearchQuery("");
  }, [store, sessionId]);

  const handleAdd = useCallback((query: string) => {
    if (!store) {
      return;
    }

    const humanId = crypto.randomUUID();
    const userId = store.getCell("configs", "singleton", "user_id") as string;

    let orgId: string | undefined;

    store.forEachRow("organizations", (rowId, forEachCell) => {
      let name: string | undefined;
      forEachCell((cellId, cell) => {
        if (cellId === "name") {
          name = cell as string;
        }
      });
      if (name === "No organization") {
        orgId = rowId;
      }
    });

    if (!orgId) {
      orgId = crypto.randomUUID();
      store.setRow("organizations", orgId, {
        user_id: userId,
        name: "No organization",
        created_at: new Date().toISOString(),
      });
    }

    store.setRow("humans", humanId, {
      user_id: userId,
      name: query,
      email: "",
      org_id: orgId,
      created_at: new Date().toISOString(),
    });

    const mappingId = crypto.randomUUID();
    store.setRow("mapping_session_participant", mappingId, {
      user_id: userId,
      session_id: sessionId,
      human_id: humanId,
      created_at: new Date().toISOString(),
    });

    setParticipantSearchQuery("");
  }, [store, sessionId]);

  return (
    <ParticipantsChip
      participants={participantGroups}
      currentUserId={currentUserId}
      isVeryNarrow={false}
      isNarrow={false}
      onParticipantClick={(participant) => {
        openNew({
          type: "contacts",
          active: true,
          state: {
            selectedPerson: participant.id,
            selectedOrganization: null,
            editingPerson: null,
            editingOrg: null,
            showNewOrg: false,
            sortOption: "alphabetical",
          },
        });
      }}
      onParticipantRemove={handleRemove}
      onParticipantAdd={handleAdd}
      onParticipantSelect={handleSelect}
      searchQuery={participantSearchQuery}
      onSearchChange={setParticipantSearchQuery}
      searchResults={participantSearch.data ?? []}
      allowMutate={true}
    />
  );
}

function useSessionParticipantGroups(
  sessionId: string,
  participantMappingIds: string[] | undefined,
  orgSliceIds: string[] | undefined,
): ParticipantGroup[] {
  const store = persisted.UI.useStore(persisted.STORE_ID);
  const indexes = persisted.UI.useIndexes(persisted.STORE_ID);

  return useMemo(() => {
    if (!store || !indexes || !participantMappingIds) {
      return [];
    }

    const participantHumanIds = new Set<string>();
    participantMappingIds.forEach((mappingId) => {
      const humanId = store.getCell("mapping_session_participant", mappingId, "human_id") as string | undefined;
      if (humanId) {
        participantHumanIds.add(humanId);
      }
    });

    const groups: ParticipantGroup[] = [];

    orgSliceIds?.forEach((orgId) => {
      const humansInOrg = indexes.getSliceRowIds(persisted.INDEXES.humansByOrg, orgId);
      const participantsInOrg = humansInOrg?.filter((humanId: string) => participantHumanIds.has(humanId)) ?? [];

      if (participantsInOrg.length === 0) {
        return;
      }

      const org = orgId ? store.getRow("organizations", orgId) : null;

      const participants = participantsInOrg.map((humanId: string) => {
        const humanRow = store.getRow("humans", humanId);
        return {
          id: humanId,
          full_name: humanRow?.name as string | null,
          email: humanRow?.email as string | null,
          job_title: humanRow?.job_title as string | null,
          linkedin_username: humanRow?.linkedin_username as string | null,
          organization: org && orgId ? { id: orgId, name: org.name as string } : null,
        };
      });

      groups.push({
        organization: org && orgId ? { id: orgId, name: org.name as string } : null,
        participants,
      });
    });

    return groups;
  }, [store, indexes, participantMappingIds, orgSliceIds, sessionId]);
}

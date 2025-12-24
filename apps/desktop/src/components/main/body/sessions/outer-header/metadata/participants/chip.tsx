import { X } from "lucide-react";
import { useCallback } from "react";

import type { SpeakerHintStorage } from "@hypr/store";
import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";

import * as main from "../../../../../../../store/tinybase/main";
import { useTabs } from "../../../../../../../store/zustand/tabs/index";

export function ParticipantChip({ mappingId }: { mappingId: string }) {
  const details = useParticipantDetails(mappingId);

  const assignedHumanId = details?.humanId;
  const sessionId = details?.sessionId;

  const handleRemove = useRemoveParticipant({
    mappingId,
    assignedHumanId,
    sessionId,
  });

  const handleClick = useCallback(() => {
    if (assignedHumanId) {
      useTabs.getState().openNew({
        type: "contacts",
        state: { selectedOrganization: null, selectedPerson: assignedHumanId },
      });
    }
  }, [assignedHumanId]);

  if (!details) {
    return null;
  }

  const { humanName } = details;

  return (
    <Badge
      variant="secondary"
      className="flex items-center gap-1 px-2 py-0.5 text-xs bg-muted cursor-pointer hover:bg-muted/80"
      onClick={handleClick}
    >
      {humanName || "Unknown"}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-0.5 h-3 w-3 p-0 hover:bg-transparent"
        onClick={(e) => {
          e.stopPropagation();
          handleRemove();
        }}
      >
        <X className="h-2.5 w-2.5" />
      </Button>
    </Badge>
  );
}

function useParticipantDetails(mappingId: string) {
  const result = main.UI.useResultRow(
    main.QUERIES.sessionParticipantsWithDetails,
    mappingId,
    main.STORE_ID,
  );

  if (!result) {
    return null;
  }

  return {
    mappingId,
    humanId: result.human_id as string,
    humanName: (result.human_name as string) || "",
    humanEmail: (result.human_email as string | undefined) || undefined,
    humanJobTitle: (result.human_job_title as string | undefined) || undefined,
    humanLinkedinUsername:
      (result.human_linkedin_username as string | undefined) || undefined,
    humanIsUser: result.human_is_user as boolean,
    orgId: (result.org_id as string | undefined) || undefined,
    orgName: result.org_name as string | undefined,
    sessionId: result.session_id as string,
  };
}

function parseHumanIdFromHintValue(value: unknown): string | undefined {
  let data = value;
  if (typeof value === "string") {
    try {
      data = JSON.parse(value);
    } catch {
      return undefined;
    }
  }

  if (data && typeof data === "object" && "human_id" in data) {
    const humanId = (data as Record<string, unknown>).human_id;
    return typeof humanId === "string" ? humanId : undefined;
  }

  return undefined;
}

function useRemoveParticipant({
  mappingId,
  assignedHumanId,
  sessionId,
}: {
  mappingId: string;
  assignedHumanId: string | undefined;
  sessionId: string | undefined;
}) {
  const store = main.UI.useStore(main.STORE_ID);
  const indexes = main.UI.useIndexes(main.STORE_ID);

  return useCallback(() => {
    if (!store) {
      return;
    }

    if (assignedHumanId && sessionId && indexes) {
      const hintIdsToDelete: string[] = [];

      const transcriptIds = indexes.getSliceRowIds(
        main.INDEXES.transcriptBySession,
        sessionId,
      );

      for (const transcriptId of transcriptIds) {
        const hintIds = indexes.getSliceRowIds(
          main.INDEXES.speakerHintsByTranscript,
          transcriptId,
        );

        for (const hintId of hintIds) {
          const hint = store.getRow("speaker_hints", hintId) as
            | SpeakerHintStorage
            | undefined;
          if (!hint || hint.type !== "user_speaker_assignment") {
            continue;
          }

          const hintHumanId = parseHumanIdFromHintValue(hint.value);
          if (hintHumanId === assignedHumanId) {
            hintIdsToDelete.push(hintId);
          }
        }
      }

      for (const hintId of hintIdsToDelete) {
        store.delRow("speaker_hints", hintId);
      }
    }

    store.delRow("mapping_session_participant", mappingId);
  }, [store, indexes, mappingId, assignedHumanId, sessionId]);
}

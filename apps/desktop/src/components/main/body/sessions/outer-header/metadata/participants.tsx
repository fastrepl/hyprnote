import { INDEXES, STORE_ID, UI } from "../../../../../../store/tinybase/persisted";

export function MeetingParticipants({ sessionId }: { sessionId: string }) {
  const participantMappingIds = UI.useSliceRowIds(
    INDEXES.sessionParticipantsBySession,
    sessionId,
    STORE_ID,
  );

  if (participantMappingIds.length === 0) {
    return <div className="text-sm text-neutral-500">No participants</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {participantMappingIds.map((mappingId) => <ParticipantRow key={mappingId} mappingId={mappingId} />)}
    </div>
  );
}

function ParticipantRow({ mappingId }: { mappingId: string }) {
  const humanId = UI.useCell("mapping_session_participant", mappingId, "human_id", STORE_ID);

  if (!humanId) {
    return null;
  }

  const human = UI.useRow("humans", humanId, STORE_ID);

  if (!human) {
    return null;
  }

  return (
    <div className="text-sm">
      <div className="font-medium">{human.name}</div>
      {human.email && <div className="text-neutral-600">{human.email}</div>}
      {human.job_title && <div className="text-neutral-500">{human.job_title}</div>}
      {human.is_user && <div className="text-xs text-blue-600">You</div>}
    </div>
  );
}

import { useFlow } from "@stackflow/react/future";
import { useMemo, useState } from "react";
import { LocalRecording, localRecordings } from "../../mock/recordings";
import { formatDateHeader, getSortedDatesForRecordings, groupRecordingsByDate } from "../../utils/date";

export function useRecordings() {
  const { replace } = useFlow();
  const [recordings] = useState<LocalRecording[]>(localRecordings);
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);

  const groupedRecordings = useMemo(() => {
    return groupRecordingsByDate(recordings);
  }, [recordings]);

  const sortedDates = useMemo(() => {
    return getSortedDatesForRecordings(groupedRecordings);
  }, [groupedRecordings]);

  const handleClickRecording = (recordingId: string) => {
    setSelectedRecordingId(prevId => prevId === recordingId ? null : recordingId);
  };

  const handleConfirmSelection = () => {
    const selectedRecording = recordings.find(
      (recording) => recording.id === selectedRecordingId,
    );

    if (selectedRecording) {
      const noteId = `note-${selectedRecording.id}`;
      replace("NoteView", { id: noteId });
    }
  };

  return {
    recordings,
    selectedRecordingId,
    groupedRecordings,
    sortedDates,
    handleClickRecording,
    handleConfirmSelection,
    formatDateHeader,
  };
}

import { useMemo } from "react";

import { execute, useLiveQuery } from "@/db";
import { captureOperationalError } from "@/lib/error-reporting";

import {
  transcriptSegments,
  SESSION_TRANSCRIPTS_SQL,
  SESSION_SPEAKERS_SQL,
  SESSION_HAS_TRANSCRIPT_SQL,
  type TranscriptRow,
} from "./transcript-model";
export type { TranscriptSegment } from "./transcript-model";

const MAX_REPORTED_INVALID_ROWS = 1_000;
const reportedInvalidRows = new Set<string>();

function rememberInvalidRow(rowId: string) {
  reportedInvalidRows.add(rowId);
  while (reportedInvalidRows.size > MAX_REPORTED_INVALID_ROWS) {
    const oldestRowId = reportedInvalidRows.values().next().value;
    if (oldestRowId === undefined) {
      break;
    }
    reportedInvalidRows.delete(oldestRowId);
  }
}

function mapTranscripts(
  rows: TranscriptRow[],
  humans: { id: string; name: string }[],
) {
  const names = new Map(humans.map((human) => [human.id, human.name]));
  return rows.flatMap((row) => {
    try {
      return transcriptSegments(row, names);
    } catch (error) {
      if (!reportedInvalidRows.has(row.id)) {
        rememberInvalidRow(row.id);
        captureOperationalError(error, {
          operation: "transcript_words_parse",
          level: "warning",
        });
      }
      return [];
    }
  });
}

export function useSessionHasTranscript(sessionId: string) {
  return useLiveQuery<{ has_transcript: number }, boolean>({
    sql: SESSION_HAS_TRANSCRIPT_SQL,
    params: [sessionId],
    mapRows: (rows) => rows[0]?.has_transcript === 1,
  });
}

export async function loadSessionTranscripts(sessionId: string) {
  const rows = await execute<TranscriptRow>(SESSION_TRANSCRIPTS_SQL, [
    sessionId,
  ]);
  if (rows.length === 0) return [];
  const humans = await execute<{ id: string; name: string }>(
    SESSION_SPEAKERS_SQL,
    [sessionId],
  );
  return mapTranscripts(rows, humans);
}

export function useSessionTranscripts(sessionId: string, enabled: boolean) {
  const {
    data: rows,
    isLoading,
    error,
  } = useLiveQuery<TranscriptRow, TranscriptRow[]>({
    sql: SESSION_TRANSCRIPTS_SQL,
    params: [sessionId],
    enabled,
    mapRows: (rows) => rows,
  });
  const {
    data: humans,
    isLoading: speakersLoading,
    error: speakersError,
  } = useLiveQuery<
    { id: string; name: string },
    { id: string; name: string }[]
  >({
    sql: SESSION_SPEAKERS_SQL,
    params: [sessionId],
    enabled: enabled && (rows?.length ?? 0) > 0,
    mapRows: (rows) => rows,
  });
  const segments = useMemo(
    () => mapTranscripts(rows ?? [], humans ?? []),
    [rows, humans],
  );
  return {
    segments,
    isLoading: isLoading || speakersLoading,
    error: error ?? speakersError,
  };
}

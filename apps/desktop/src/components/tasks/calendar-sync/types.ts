export type ChunkArg = {
  chunks: Array<{ from: string; to: string }>;
  calendarTrackingIds: string[];
  currentChunkIndex: number;
  currentCalendarIndex: number;
};

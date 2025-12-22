import { faker } from "@faker-js/faker";

import type { SessionStorage, Transcript, WordStorage } from "@hypr/store";

import { createSession, generateTranscript } from "../shared";

export const buildSessionsForBigWorkspace = (
  count: number,
  options: {
    eventIds?: string[];
    folderIds?: string[];
    eventLinkProbability?: number;
    folderProbability?: number;
  } = {},
): Record<string, SessionStorage> => {
  const sessions: Record<string, SessionStorage> = {};
  const {
    eventIds = [],
    folderIds = [],
    eventLinkProbability = 0.6,
    folderProbability = 0.6,
  } = options;

  for (let i = 0; i < count; i++) {
    const shouldLinkToEvent =
      eventIds.length > 0 &&
      faker.datatype.boolean({ probability: eventLinkProbability });
    const shouldAddToFolder =
      folderIds.length > 0 &&
      faker.datatype.boolean({ probability: folderProbability });

    const eventId = shouldLinkToEvent
      ? faker.helpers.arrayElement(eventIds)
      : undefined;
    const folderId = shouldAddToFolder
      ? faker.helpers.arrayElement(folderIds)
      : undefined;

    const session = createSession(eventId, folderId);
    sessions[session.id] = session.data;
  }

  return sessions;
};

export const buildLongTranscriptsForSessions = (
  sessionIds: string[],
  options: {
    turnCount?: { min: number; max: number };
    days?: number;
  } = {},
): {
  transcripts: Record<string, Transcript>;
  words: Record<string, WordStorage>;
} => {
  const { turnCount = { min: 1500, max: 2000 }, days = 90 } = options;
  const transcripts: Record<string, Transcript> = {};
  const words: Record<string, WordStorage> = {};

  sessionIds.forEach((sessionId) => {
    const result = generateTranscript({ sessionId, turnCount, days });

    if (!("transcript" in result)) {
      throw new Error("Expected transcript metadata");
    }

    const { transcriptId, transcript, words: transcriptWords } = result;

    Object.entries(transcriptWords).forEach(([wordId, word]) => {
      words[wordId] = word;
    });

    transcripts[transcriptId] = transcript;
  });

  return { transcripts, words };
};

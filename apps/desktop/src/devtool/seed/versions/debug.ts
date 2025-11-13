import { faker } from "@faker-js/faker";
import type { Tables } from "tinybase/with-schemas";

import type { Schemas } from "../../../store/tinybase/main";
import type { Store as PersistedStore } from "../../../store/tinybase/main";
import type { WordStorage } from "../../../store/tinybase/main";
import { DEFAULT_USER_ID, id } from "../../../utils";
import type { SeedDefinition } from "../shared";
import {
  buildCalendars,
  buildHumans,
  buildOrganizations,
  buildSessionParticipants,
  buildTags,
} from "../shared";
import { createSession } from "../shared/session";

faker.seed(456);

const generateLongTranscript = (targetDurationMs: number) => {
  const transcriptId = id();
  const words: Array<WordStorage> = [];
  let currentTimeMs = 0;
  let currentChannel = 0;
  const channelCount = 2;
  const createdAt = faker.date.recent({ days: 30 }).toISOString();

  const starters = [
    "yeah",
    "so",
    "honestly",
    "right",
    "okay",
    "look",
    "listen",
    "alright",
    "well",
    "now",
  ];

  const bridges = [
    "you know",
    "I mean",
    "kind of",
    "sort of",
    "at the moment",
    "for example",
    "basically",
    "on our side",
    "in my opinion",
    "to be honest",
  ];

  const sanitizeWord = (raw: string) =>
    raw.replace(/^[^A-Za-z0-9'-]+/, "").replace(/[^A-Za-z0-9'-]+$/, "");

  const durationForWord = (text: string) => {
    const base = faker.number.int({ min: 110, max: 260 });
    const charBonus = Math.min(text.length * 32, 420);
    const variation = faker.number.int({ min: -35, max: 95 });
    return Math.max(80, base + charBonus + variation);
  };

  const appendPhrase = (target: string[], phrase: string) => {
    phrase
      .split(/\s+/)
      .filter(Boolean)
      .forEach((piece) => target.push(piece));
  };

  const generateSentence = () => {
    const sentenceWords: string[] = [];
    const isShort = faker.datatype.boolean({ probability: 0.3 });

    if (isShort) {
      const lengthRange = faker.number.int({ min: 3, max: 6 });
      appendPhrase(sentenceWords, faker.lorem.words(lengthRange));
    } else {
      if (faker.datatype.boolean({ probability: 0.5 })) {
        appendPhrase(sentenceWords, faker.helpers.arrayElement(starters));
      }

      const lengthRange = faker.number.int({ min: 10, max: 25 });
      appendPhrase(sentenceWords, faker.lorem.words(lengthRange));

      if (faker.datatype.boolean({ probability: 0.4 })) {
        appendPhrase(sentenceWords, faker.helpers.arrayElement(bridges));
        appendPhrase(
          sentenceWords,
          faker.lorem.words(faker.number.int({ min: 3, max: 10 })),
        );
      }
    }

    return sentenceWords;
  };

  while (currentTimeMs < targetDurationMs) {
    const sentenceCount = faker.number.int({ min: 2, max: 8 });

    for (
      let sentenceIndex = 0;
      sentenceIndex < sentenceCount;
      sentenceIndex++
    ) {
      const sentenceWords = generateSentence();

      for (const raw of sentenceWords) {
        const text = sanitizeWord(raw);
        if (!text) {
          continue;
        }

        const start_ms = currentTimeMs;
        const durationMs = durationForWord(text);
        const end_ms = start_ms + durationMs;

        words.push({
          user_id: DEFAULT_USER_ID,
          created_at: createdAt,
          transcript_id: transcriptId,
          channel: currentChannel,
          text: ` ${text}`,
          start_ms,
          end_ms,
        });

        currentTimeMs = end_ms;
        currentTimeMs += faker.number.int({ min: 40, max: 120 });
      }

      if (sentenceIndex < sentenceCount - 1) {
        const sentenceGap = faker.number.int({ min: 150, max: 600 });
        currentTimeMs += sentenceGap;
      }
    }

    currentTimeMs += faker.number.int({ min: 400, max: 1200 });

    if (faker.datatype.boolean({ probability: 0.15 })) {
      currentTimeMs += faker.number.int({ min: 1000, max: 3000 });
    }

    currentChannel = (currentChannel + 1) % channelCount;

    if (currentTimeMs >= targetDurationMs) {
      break;
    }
  }

  return { transcriptId, words, endedAt: currentTimeMs };
};

const DEBUG_DATA = (() => {
  const organizations = buildOrganizations(1);
  const orgIds = Object.keys(organizations);

  const humans = buildHumans(orgIds, {
    includeCurrentUser: true,
    countPerOrg: { min: 2, max: 3 },
  });
  const humanIds = Object.keys(humans);

  const calendars = buildCalendars(1);
  const tags = buildTags(3);

  const session1 = createSession();
  const sessionId1 = session1.id;
  const session2 = createSession();
  const sessionId2 = session2.id;
  const session3 = createSession();
  const sessionId3 = session3.id;
  const session4 = createSession();
  const sessionId4 = session4.id;
  const sessions = {
    [sessionId1]: session1.data,
    [sessionId2]: session2.data,
    [sessionId3]: session3.data,
    [sessionId4]: session4.data,
  };

  const thirtyMinutesMs = 30 * 60 * 1000;
  const {
    transcriptId: transcriptId1,
    words: words1,
    endedAt: endedAt1,
  } = generateLongTranscript(thirtyMinutesMs);

  const oneHourMs = 60 * 60 * 1000;
  const {
    transcriptId: transcriptId2,
    words: words2,
    endedAt: endedAt2,
  } = generateLongTranscript(oneHourMs);

  const twoHoursMs = 2 * 60 * 60 * 1000;
  const {
    transcriptId: transcriptId3,
    words: words3,
    endedAt: endedAt3,
  } = generateLongTranscript(twoHoursMs);

  const fourHoursMs = 4 * 60 * 60 * 1000;
  const {
    transcriptId: transcriptId4,
    words: words4,
    endedAt: endedAt4,
  } = generateLongTranscript(fourHoursMs);

  const createdAt1 = faker.date.recent({ days: 30 });
  const startedAt1 = createdAt1.getTime();
  const createdAt2 = faker.date.recent({ days: 25 });
  const startedAt2 = createdAt2.getTime();
  const createdAt3 = faker.date.recent({ days: 20 });
  const startedAt3 = createdAt3.getTime();
  const createdAt4 = faker.date.recent({ days: 15 });
  const startedAt4 = createdAt4.getTime();

  const transcripts = {
    [transcriptId1]: {
      user_id: DEFAULT_USER_ID,
      session_id: sessionId1,
      created_at: createdAt1.toISOString(),
      started_at: startedAt1,
      ended_at: startedAt1 + endedAt1,
    },
    [transcriptId2]: {
      user_id: DEFAULT_USER_ID,
      session_id: sessionId2,
      created_at: createdAt2.toISOString(),
      started_at: startedAt2,
      ended_at: startedAt2 + endedAt2,
    },
    [transcriptId3]: {
      user_id: DEFAULT_USER_ID,
      session_id: sessionId3,
      created_at: createdAt3.toISOString(),
      started_at: startedAt3,
      ended_at: startedAt3 + endedAt3,
    },
    [transcriptId4]: {
      user_id: DEFAULT_USER_ID,
      session_id: sessionId4,
      created_at: createdAt4.toISOString(),
      started_at: startedAt4,
      ended_at: startedAt4 + endedAt4,
    },
  };

  const wordsRecord: Record<string, WordStorage> = {};
  [...words1, ...words2, ...words3, ...words4].forEach((word) => {
    wordsRecord[id()] = word;
  });

  const mapping_session_participant = {
    ...buildSessionParticipants([sessionId1], humanIds, { min: 2, max: 2 }),
    ...buildSessionParticipants([sessionId2], humanIds, { min: 2, max: 2 }),
    ...buildSessionParticipants([sessionId3], humanIds, { min: 2, max: 2 }),
    ...buildSessionParticipants([sessionId4], humanIds, { min: 2, max: 2 }),
  };

  return {
    organizations,
    humans,
    calendars,
    folders: {},
    sessions,
    transcripts,
    words: wordsRecord,
    events: {},
    mapping_session_participant,
    tags,
    mapping_tag_session: {},
    templates: {},
    chat_groups: {},
    chat_messages: {},
    memories: {},
  } satisfies Tables<Schemas[0]>;
})();

export const debugSeed: SeedDefinition = {
  id: "debug",
  label: "Debug",
  run: (store: PersistedStore) => {
    store.transaction(() => {
      store.delTables();
      store.setTables(DEBUG_DATA);
    });
  },
};

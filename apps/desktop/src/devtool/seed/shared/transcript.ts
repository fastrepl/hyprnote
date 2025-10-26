import { faker } from "@faker-js/faker";

import type { Word } from "../../../store/tinybase/persisted";
import { DEFAULT_USER_ID, id } from "../../../utils";

const selectWeighted = <T>(choices: Array<{ weight: number; value: T }>): T =>
  faker.helpers.weightedArrayElement(choices);

const appendPhrase = (target: string[], phrase: string) => {
  phrase
    .split(/\s+/)
    .filter(Boolean)
    .forEach(piece => target.push(piece));
};

const sanitizeWord = (raw: string) => raw.replace(/^[^A-Za-z0-9'-]+/, "").replace(/[^A-Za-z0-9'-]+$/, "");

const durationForWord = (text: string) => {
  const base = faker.number.int({ min: 110, max: 260 });
  const charBonus = Math.min(text.length * 32, 420);
  const variation = faker.number.int({ min: -35, max: 95 });
  return Math.max(80, base + charBonus + variation);
};

export const generateTranscript = () => {
  const channelCount = selectWeighted([
    { weight: 55, value: 2 },
    { weight: 30, value: 3 },
    { weight: 15, value: 4 },
  ]);

  const turnRange = selectWeighted([
    { weight: 18, value: { min: 18, max: 26 } },
    { weight: 36, value: { min: 27, max: 42 } },
    { weight: 28, value: { min: 43, max: 64 } },
    { weight: 18, value: { min: 65, max: 92 } },
  ]);
  const turnCount = faker.number.int(turnRange);

  const channelIndices = Array.from({ length: channelCount }, (_, index) => index);
  const words: Array<Word> = [];
  let currentTimeMs = 0;
  let previousChannel: number | undefined;

  const starters = [
    "yeah",
    "so",
    "honestly",
    "right",
    "okay",
    "look",
    "listen",
    "alright",
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
  ];
  const briefReplies = [
    "right",
    "exactly",
    "totally",
    "absolutely",
    "thanks",
    "nice",
    "got it",
    "makes sense",
  ];
  const endCaps = [
    "if that works",
    "if that makes sense",
    "what do you think",
    "does that sound good",
    "for next steps",
    "and that's the plan",
  ];

  const chooseChannel = () => {
    if (previousChannel === undefined) {
      previousChannel = faker.helpers.arrayElement(channelIndices);
      return previousChannel;
    }

    if (faker.datatype.boolean({ probability: 0.22 })) {
      return previousChannel;
    }

    const pool = channelIndices.filter(index => index !== previousChannel);
    const nextChannel = pool.length > 0 ? faker.helpers.arrayElement(pool) : previousChannel;
    previousChannel = nextChannel;
    return nextChannel;
  };

  for (let turnIndex = 0; turnIndex < turnCount; turnIndex++) {
    const channel = chooseChannel();
    const isQuickTurn = faker.datatype.boolean({ probability: 0.18 });
    const clauseCount = isQuickTurn ? 1 : faker.number.int({ min: 1, max: 4 });
    const turnWords: string[] = [];

    if (isQuickTurn) {
      appendPhrase(turnWords, faker.helpers.arrayElement(briefReplies));

      if (faker.datatype.boolean({ probability: 0.45 })) {
        appendPhrase(turnWords, faker.helpers.arrayElement(starters));
      }

      if (faker.datatype.boolean({ probability: 0.4 })) {
        appendPhrase(turnWords, faker.lorem.words(faker.number.int({ min: 2, max: 5 })));
      }
    } else {
      for (let clauseIndex = 0; clauseIndex < clauseCount; clauseIndex++) {
        if (clauseIndex === 0 && faker.datatype.boolean({ probability: 0.55 })) {
          appendPhrase(turnWords, faker.helpers.arrayElement(starters));
        }

        const lengthRange = selectWeighted([
          { weight: 22, value: { min: 4, max: 7 } },
          { weight: 36, value: { min: 8, max: 13 } },
          { weight: 28, value: { min: 14, max: 20 } },
          { weight: 14, value: { min: 21, max: 28 } },
        ]);
        const phraseWords = faker.lorem.words(faker.number.int(lengthRange));
        appendPhrase(turnWords, phraseWords);

        if (faker.datatype.boolean({ probability: 0.42 })) {
          appendPhrase(turnWords, faker.helpers.arrayElement(bridges));
        }

        if (faker.datatype.boolean({ probability: 0.2 })) {
          appendPhrase(turnWords, String(faker.number.int({ min: 2, max: 120 })));
        }

        if (faker.datatype.boolean({ probability: 0.3 })) {
          appendPhrase(turnWords, faker.lorem.words(faker.number.int({ min: 3, max: 6 })));
        }
      }

      if (faker.datatype.boolean({ probability: 0.35 })) {
        appendPhrase(turnWords, faker.helpers.arrayElement(endCaps));
      }
    }

    if (!turnWords.length) {
      appendPhrase(turnWords, faker.lorem.words(faker.number.int({ min: 3, max: 7 })));
    }

    for (const raw of turnWords) {
      const text = sanitizeWord(raw);
      if (!text) {
        continue;
      }

      const start_ms = currentTimeMs;
      const durationMs = durationForWord(text);
      const end_ms = start_ms + durationMs;

      words.push({
        user_id: DEFAULT_USER_ID,
        created_at: faker.date.recent({ days: 30 }).toISOString(),
        transcript_id: id(),
        channel,
        text,
        start_ms,
        end_ms,
      });

      currentTimeMs = end_ms;
      const intraPause = faker.datatype.boolean({ probability: 0.22 })
        ? faker.number.int({ min: 120, max: 360 })
        : faker.number.int({ min: 40, max: 140 });
      currentTimeMs += intraPause;
    }

    currentTimeMs += faker.number.int({ min: 260, max: 980 });

    if (faker.datatype.boolean({ probability: 0.14 })) {
      currentTimeMs += faker.number.int({ min: 1400, max: 3600 });
    }
  }

  return { words };
};

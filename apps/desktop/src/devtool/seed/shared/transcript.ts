import { faker } from "@faker-js/faker";

import type { Word } from "../../../store/tinybase/persisted";
import { DEFAULT_USER_ID, id } from "../../../utils";

export const generateTranscript = () => {
  const wordCount = faker.number.int({ min: 50, max: 200 });
  const words: Array<Word> = [];

  let currentTimeMs = 0;

  for (let i = 0; i < wordCount; i++) {
    const word = faker.lorem.word();
    const durationMs = faker.number.int({ min: 200, max: 800 });

    words.push({
      user_id: DEFAULT_USER_ID,
      created_at: faker.date.recent({ days: 30 }).toISOString(),
      transcript_id: id(),
      channel: 0,
      text: word,
      start_ms: currentTimeMs,
      end_ms: currentTimeMs + durationMs,
    });

    currentTimeMs += durationMs + faker.number.int({ min: 50, max: 300 });
  }

  return { words };
};

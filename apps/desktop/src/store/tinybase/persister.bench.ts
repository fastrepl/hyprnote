import { createMergeableStore } from "tinybase/with-schemas";
import { bench, describe } from "vitest";

import { SCHEMA } from "@hypr/store";
import { isValidTiptapContent, json2md } from "@hypr/tiptap/shared";

function createTestStore() {
  return createMergeableStore()
    .setTablesSchema(SCHEMA.table)
    .setValuesSchema(SCHEMA.value);
}

function generateTiptapContent(paragraphCount: number): string {
  const paragraphs = Array.from({ length: paragraphCount }, (_, i) => ({
    type: "paragraph",
    content: [
      {
        type: "text",
        text: `This is paragraph ${i + 1} with some sample text that represents typical meeting notes content. It includes various details about discussions, action items, and follow-ups that would be captured during a meeting.`,
      },
    ],
  }));

  return JSON.stringify({
    type: "doc",
    content: paragraphs,
  });
}

function generateWord(index: number, transcriptId: string) {
  return {
    user_id: "user-1",
    created_at: new Date().toISOString(),
    text: `word${index}`,
    transcript_id: transcriptId,
    start_ms: index * 100,
    end_ms: index * 100 + 90,
    channel: 0,
    speaker: index % 2 === 0 ? "speaker-1" : "speaker-2",
    metadata: JSON.stringify({ confidence: 0.95 }),
  };
}

function generateSpeakerHint(
  index: number,
  transcriptId: string,
  wordId: string,
) {
  return {
    user_id: "user-1",
    created_at: new Date().toISOString(),
    transcript_id: transcriptId,
    word_id: wordId,
    type: "manual",
    value: JSON.stringify({ speaker: `speaker-${(index % 3) + 1}` }),
  };
}

function generateEnhancedNote(sessionId: string, paragraphCount: number) {
  return {
    user_id: "user-1",
    created_at: new Date().toISOString(),
    session_id: sessionId,
    content: generateTiptapContent(paragraphCount),
    position: 0,
    title: "Summary",
  };
}

function generateSession(index: number) {
  return {
    user_id: "user-1",
    created_at: new Date().toISOString(),
    title: `Meeting ${index + 1}`,
    raw_md: generateTiptapContent(5),
    enhanced_md: "",
  };
}

function populateStore(
  store: ReturnType<typeof createTestStore>,
  config: {
    sessionCount: number;
    wordsPerSession: number;
    speakerHintsPerSession: number;
    enhancedNotesPerSession: number;
    paragraphsPerNote: number;
  },
) {
  const {
    sessionCount,
    wordsPerSession,
    speakerHintsPerSession,
    enhancedNotesPerSession,
    paragraphsPerNote,
  } = config;

  for (let s = 0; s < sessionCount; s++) {
    const sessionId = `session-${s}`;
    const transcriptId = `transcript-${s}`;

    store.setRow("sessions", sessionId, generateSession(s));

    store.setRow("transcripts", transcriptId, {
      user_id: "user-1",
      created_at: new Date().toISOString(),
      session_id: sessionId,
      started_at: Date.now(),
      ended_at: Date.now() + 3600000,
    });

    for (let w = 0; w < wordsPerSession; w++) {
      const wordId = `word-${s}-${w}`;
      store.setRow("words", wordId, generateWord(w, transcriptId));

      if (w < speakerHintsPerSession) {
        store.setRow(
          "speaker_hints",
          `hint-${s}-${w}`,
          generateSpeakerHint(w, transcriptId, wordId),
        );
      }
    }

    for (let e = 0; e < enhancedNotesPerSession; e++) {
      store.setRow("enhanced_notes", `note-${s}-${e}`, {
        ...generateEnhancedNote(sessionId, paragraphsPerNote),
        position: e,
      });
    }
  }
}

describe("Store Serialization (CPU-bound)", () => {
  const configs = [
    {
      name: "Small (1 session, 100 words)",
      sessionCount: 1,
      wordsPerSession: 100,
      speakerHintsPerSession: 10,
      enhancedNotesPerSession: 1,
      paragraphsPerNote: 5,
    },
    {
      name: "Medium (5 sessions, 500 words each)",
      sessionCount: 5,
      wordsPerSession: 500,
      speakerHintsPerSession: 50,
      enhancedNotesPerSession: 2,
      paragraphsPerNote: 10,
    },
    {
      name: "Large (10 sessions, 1000 words each)",
      sessionCount: 10,
      wordsPerSession: 1000,
      speakerHintsPerSession: 100,
      enhancedNotesPerSession: 3,
      paragraphsPerNote: 15,
    },
    {
      name: "XLarge (20 sessions, 2000 words each)",
      sessionCount: 20,
      wordsPerSession: 2000,
      speakerHintsPerSession: 200,
      enhancedNotesPerSession: 5,
      paragraphsPerNote: 20,
    },
  ];

  for (const config of configs) {
    const store = createTestStore();
    populateStore(store, config);

    bench(`JSON.stringify - ${config.name}`, () => {
      const tables = store.getTables();
      const values = store.getValues();
      JSON.stringify({ tables, values });
    });

    bench(`JSON.parse - ${config.name}`, () => {
      const tables = store.getTables();
      const values = store.getValues();
      const json = JSON.stringify({ tables, values });
      JSON.parse(json);
    });

    bench(`Full roundtrip (stringify + parse) - ${config.name}`, () => {
      const tables = store.getTables();
      const values = store.getValues();
      const json = JSON.stringify({ tables, values });
      JSON.parse(json);
    });
  }
});

describe("localPersister2 CPU work (iteration + json2md)", () => {
  const configs = [
    {
      name: "Small (5 notes, 5 paragraphs)",
      noteCount: 5,
      paragraphsPerNote: 5,
    },
    {
      name: "Medium (20 notes, 10 paragraphs)",
      noteCount: 20,
      paragraphsPerNote: 10,
    },
    {
      name: "Large (50 notes, 15 paragraphs)",
      noteCount: 50,
      paragraphsPerNote: 15,
    },
    {
      name: "XLarge (100 notes, 20 paragraphs)",
      noteCount: 100,
      paragraphsPerNote: 20,
    },
  ];

  for (const config of configs) {
    const store = createTestStore();

    for (let i = 0; i < config.noteCount; i++) {
      store.setRow("enhanced_notes", `note-${i}`, {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: `session-${i % 10}`,
        content: generateTiptapContent(config.paragraphsPerNote),
        position: i,
        title: `Note ${i}`,
      });

      store.setRow("sessions", `session-${i % 10}`, {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        title: `Session ${i % 10}`,
        raw_md: generateTiptapContent(config.paragraphsPerNote),
        enhanced_md: "",
      });
    }

    bench(`Iterate enhanced_notes - ${config.name}`, () => {
      const tables = store.getTables();
      const notes = tables.enhanced_notes ?? {};
      Object.entries(notes).forEach(([id, row]) => {
        void id;
        void row;
      });
    });

    bench(`JSON.parse content - ${config.name}`, () => {
      const tables = store.getTables();
      const notes = tables.enhanced_notes ?? {};
      Object.entries(notes).forEach(([_id, row]) => {
        if (row.content) {
          JSON.parse(row.content as string);
        }
      });
    });

    bench(
      `Full localPersister2 CPU work (parse + json2md) - ${config.name}`,
      () => {
        const tables = store.getTables();
        const notes = tables.enhanced_notes ?? {};
        Object.entries(notes).forEach(([_id, row]) => {
          if (row.content) {
            try {
              const parsed = JSON.parse(row.content as string);
              if (isValidTiptapContent(parsed)) {
                json2md(parsed);
              }
            } catch {
              // ignore
            }
          }
        });
      },
    );
  }
});

describe("I/O Simulation (with delays)", () => {
  const store = createTestStore();
  populateStore(store, {
    sessionCount: 10,
    wordsPerSession: 1000,
    speakerHintsPerSession: 100,
    enhancedNotesPerSession: 3,
    paragraphsPerNote: 15,
  });

  const simulatedIoDelayMs = 5;

  bench("CPU only: JSON.stringify large store", () => {
    const tables = store.getTables();
    const values = store.getValues();
    JSON.stringify({ tables, values });
  });

  bench("CPU + simulated I/O: serialize + write delay", async () => {
    const tables = store.getTables();
    const values = store.getValues();
    const json = JSON.stringify({ tables, values });

    await new Promise((resolve) => setTimeout(resolve, simulatedIoDelayMs));
    void json;
  });

  bench("localPersister2: CPU work only", () => {
    const tables = store.getTables();
    const notes = tables.enhanced_notes ?? {};
    const sessions = tables.sessions ?? {};

    Object.entries(notes).forEach(([_id, row]) => {
      if (row.content) {
        try {
          const parsed = JSON.parse(row.content as string);
          if (isValidTiptapContent(parsed)) {
            json2md(parsed);
          }
        } catch {
          // ignore
        }
      }
    });

    Object.entries(sessions).forEach(([_id, row]) => {
      if (row.raw_md) {
        try {
          const parsed = JSON.parse(row.raw_md as string);
          if (isValidTiptapContent(parsed)) {
            json2md(parsed);
          }
        } catch {
          // ignore
        }
      }
    });
  });

  bench("localPersister2: CPU + simulated I/O per file", async () => {
    const tables = store.getTables();
    const notes = tables.enhanced_notes ?? {};
    const sessions = tables.sessions ?? {};

    const promises: Promise<void>[] = [];

    Object.entries(notes).forEach(([_id, row]) => {
      if (row.content) {
        try {
          const parsed = JSON.parse(row.content as string);
          if (isValidTiptapContent(parsed)) {
            const md = json2md(parsed);
            promises.push(
              new Promise((resolve) => {
                setTimeout(() => {
                  void md;
                  resolve();
                }, simulatedIoDelayMs);
              }),
            );
          }
        } catch {
          // ignore
        }
      }
    });

    Object.entries(sessions).forEach(([_id, row]) => {
      if (row.raw_md) {
        try {
          const parsed = JSON.parse(row.raw_md as string);
          if (isValidTiptapContent(parsed)) {
            const md = json2md(parsed);
            promises.push(
              new Promise((resolve) => {
                setTimeout(() => {
                  void md;
                  resolve();
                }, simulatedIoDelayMs);
              }),
            );
          }
        } catch {
          // ignore
        }
      }
    });

    await Promise.all(promises);
  });
});

describe("Changes table impact", () => {
  const baseSizes = [0, 100, 500, 1000, 5000];

  for (const changesCount of baseSizes) {
    const store = createTestStore();

    populateStore(store, {
      sessionCount: 5,
      wordsPerSession: 500,
      speakerHintsPerSession: 50,
      enhancedNotesPerSession: 2,
      paragraphsPerNote: 10,
    });

    for (let i = 0; i < changesCount; i++) {
      store.setRow("changes", `change-${i}`, {
        row_id: `row-${i}`,
        table: "sessions",
        updated: true,
        deleted: false,
      });
    }

    bench(`Serialize with ${changesCount} changes rows`, () => {
      const tables = store.getTables();
      const values = store.getValues();
      JSON.stringify({ tables, values });
    });
  }
});

describe("Row count impact analysis", () => {
  const wordCounts = [100, 500, 1000, 2000, 5000, 10000];

  for (const wordCount of wordCounts) {
    const store = createTestStore();

    store.setRow("sessions", "session-1", generateSession(0));
    store.setRow("transcripts", "transcript-1", {
      user_id: "user-1",
      created_at: new Date().toISOString(),
      session_id: "session-1",
      started_at: Date.now(),
      ended_at: Date.now() + 3600000,
    });

    for (let w = 0; w < wordCount; w++) {
      store.setRow("words", `word-${w}`, generateWord(w, "transcript-1"));
    }

    bench(`Serialize store with ${wordCount} words`, () => {
      const tables = store.getTables();
      const values = store.getValues();
      JSON.stringify({ tables, values });
    });
  }
});

import { faker } from "@faker-js/faker/locale/en";
import type { Tables } from "tinybase/with-schemas";

import type { Schemas } from "../../../../store/tinybase/main";
import type { Store as MainStore } from "../../../../store/tinybase/main";
import type { SeedDefinition } from "../shared";
import {
  createHuman,
  createOrganization,
  createSession,
  generateTranscript,
} from "../shared";

const buildLongData = (): Tables<Schemas[0]> => {
  faker.seed(789);

  const organization = createOrganization();
  const human = createHuman(organization.id);
  const session = createSession();

  const result = generateTranscript({
    turnCount: { min: 300, max: 300 },
    days: 7,
    sessionId: session.id,
  });

  if (!("transcript" in result)) {
    throw new Error("Expected transcript metadata");
  }

  const { transcriptId, transcript, words } = result;

  return {
    organizations: { [organization.id]: organization.data },
    humans: { [human.id]: human.data },
    sessions: { [session.id]: session.data },
    transcripts: { [transcriptId]: transcript },
    words,
  };
};

export const longSeed: SeedDefinition = {
  id: "long",
  label: "Long",
  calendarFixtureBase: "default",
  run: async (store: MainStore) => {
    const data = buildLongData();
    await new Promise((r) => setTimeout(r, 0));
    store.transaction(() => {
      store.delTables();
      store.setTables(data);
    });
  },
};

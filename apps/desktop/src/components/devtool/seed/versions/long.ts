import { faker } from "@faker-js/faker";
import type { Tables } from "tinybase/with-schemas";

import type { Schemas } from "../../../../store/tinybase/main";
import type { Store as PersistedStore } from "../../../../store/tinybase/main";
import type { SeedDefinition } from "../shared";
import {
  createHuman,
  createOrganization,
  createSession,
  generateTranscript,
} from "../shared";

faker.seed(789);

const LONG_DATA = (() => {
  const organization = createOrganization();
  const human = createHuman(organization.id, true);
  const session = createSession();

  const result = generateTranscript({
    turnCount: { min: 800, max: 1200 },
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
  } satisfies Tables<Schemas[0]>;
})();

export const longSeed: SeedDefinition = {
  id: "long",
  label: "Long",
  run: (store: PersistedStore) => {
    store.transaction(() => {
      store.delTables();
      store.setTables(LONG_DATA);
    });
  },
};

import { faker } from "@faker-js/faker";
import type { Tables } from "tinybase/with-schemas";

import type { Schemas } from "../../../store/tinybase/persisted";
import type { Store as PersistedStore } from "../../../store/tinybase/persisted";
import { DEFAULT_USER_ID, id } from "../../../utils";
import exampleSessions from "../data/example-sessions.json";
import type { SeedDefinition } from "../shared";
import {
  buildCalendars,
  buildChatGroups,
  buildChatMessages,
  buildEventsByHuman,
  buildFolders,
  buildHumans,
  buildMemories,
  buildOrganizations,
  buildSessionParticipants,
  buildSessions,
  buildSessionTags,
  buildTags,
  buildTemplates,
  buildTranscriptsForSessions,
} from "../shared";

faker.seed(456);

const V2 = (() => {
  const organizations = buildOrganizations(2);
  const orgIds = Object.keys(organizations);

  const humans = buildHumans(orgIds, {
    includeCurrentUser: true,
    countPerOrg: { min: 1, max: 3 },
  });
  const humanIds = Object.keys(humans);

  const calendars = buildCalendars(2);
  const calendarIds = Object.keys(calendars);

  const { events } = buildEventsByHuman(humanIds, calendarIds, {
    min: 0,
    max: 2,
  });

  const folders = buildFolders(2, { min: 0, max: 2 });
  const folderIds = Object.keys(folders);

  const tags = buildTags(5);
  const tagIds = Object.keys(tags);

  const templates = buildTemplates(3);

  const generatedSessions = buildSessions(5, {
    folderIds,
    folderProbability: 0.5,
  });

  const richSessions = {
    ...generatedSessions,
  };

  exampleSessions.forEach((session) => {
    const sessionId = id();
    richSessions[sessionId] = {
      user_id: DEFAULT_USER_ID,
      title: session.title,
      raw_md: session.raw_md,
      enhanced_md: session.enhanced_md,
      created_at: faker.date.recent({ days: 30 }).toISOString(),
      event_id: undefined,
      folder_id: folderIds.length > 0 ? faker.helpers.arrayElement(folderIds) : undefined,
    };
  });

  const sessionIds = Object.keys(richSessions);

  const { transcripts, words } = buildTranscriptsForSessions(sessionIds);

  const mapping_session_participant = buildSessionParticipants(sessionIds, humanIds, {
    min: 1,
    max: 2,
  });

  const mapping_tag_session = buildSessionTags(sessionIds, tagIds, {
    tagProbability: 0.4,
    tagsPerSession: { min: 1, max: 2 },
  });

  const chat_groups = buildChatGroups(3);
  const chatGroupIds = Object.keys(chat_groups);

  const chat_messages = buildChatMessages(chatGroupIds, { min: 2, max: 6 });

  const memories = buildMemories("vocab", 5);

  return {
    organizations,
    humans,
    calendars,
    folders,
    sessions: richSessions,
    transcripts,
    words,
    events,
    mapping_session_participant,
    tags,
    mapping_tag_session,
    templates,
    chat_groups,
    chat_messages,
    memories,
  } satisfies Tables<Schemas[0]>;
})();

export const v2Seed: SeedDefinition = {
  id: "v2",
  label: "Seed V2 (Rich Content)",
  run: (store: PersistedStore) => {
    store.delTables();
    store.setTables(V2);
  },
};

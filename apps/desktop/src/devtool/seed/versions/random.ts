import { faker } from "@faker-js/faker";
import type { Tables } from "tinybase/with-schemas";

import type { Schemas } from "../../../store/tinybase/persisted";
import type { Store as PersistedStore } from "../../../store/tinybase/persisted";
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
  buildSessionsPerHuman,
  buildSessionTags,
  buildTags,
  buildTemplates,
  buildTranscriptsForSessions,
} from "../shared";

faker.seed(123);

const RANDOM_DATA = (() => {
  const organizations = buildOrganizations(4);
  const orgIds = Object.keys(organizations);

  const humans = buildHumans(orgIds, {
    includeCurrentUser: true,
    countPerOrg: { min: 2, max: 5 },
  });
  const humanIds = Object.keys(humans);

  const calendars = buildCalendars(3);
  const calendarIds = Object.keys(calendars);

  const { events, eventsByHuman } = buildEventsByHuman(humanIds, calendarIds, {
    min: 1,
    max: 4,
  });

  const folders = buildFolders(3, { min: 0, max: 3 });
  const folderIds = Object.keys(folders);

  const tags = buildTags(8);
  const tagIds = Object.keys(tags);

  const templates = buildTemplates(5);

  const sessions = buildSessionsPerHuman(humanIds, { min: 1, max: 4 }, {
    eventsByHuman,
    folderIds,
    eventLinkProbability: 0.6,
    folderProbability: 0.6,
  });
  const sessionIds = Object.keys(sessions);

  const { transcripts, words } = buildTranscriptsForSessions(sessionIds);

  const mapping_session_participant = buildSessionParticipants(sessionIds, humanIds, {
    min: 1,
    max: 4,
  });

  const mapping_tag_session = buildSessionTags(sessionIds, tagIds, {
    tagProbability: 0.6,
    tagsPerSession: { min: 1, max: 3 },
  });

  const chat_groups = buildChatGroups(5);
  const chatGroupIds = Object.keys(chat_groups);

  const chat_messages = buildChatMessages(chatGroupIds, { min: 3, max: 10 });

  const memories = buildMemories("vocab", 8);

  return {
    organizations,
    humans,
    calendars,
    folders,
    sessions,
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

export const randomSeed: SeedDefinition = {
  id: "random",
  label: "Random",
  run: (store: PersistedStore) => {
    store.delTables();
    store.setTables(RANDOM_DATA);
  },
};

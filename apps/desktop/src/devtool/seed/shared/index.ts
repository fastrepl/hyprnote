import { faker } from "@faker-js/faker";

import type { Store as PersistedStore } from "../../../store/tinybase/persisted";
import type {
  Calendar,
  ChatGroup,
  ChatMessageStorage,
  Event,
  Folder,
  Human,
  mappingSessionParticipant,
  MappingTagSession,
  MemoryStorage,
  Organization,
  SessionStorage,
  Tag,
  TemplateStorage,
  Transcript,
  Word,
} from "../../../store/tinybase/persisted";

import { DEFAULT_USER_ID, id } from "../../../utils";
import { createCalendar } from "./calendar";
import { createChatGroup, createChatMessage } from "./chat";
import { createEvent } from "./event";
import { createFolder } from "./folder";
import { createHuman } from "./human";
import { createmappingSessionParticipant, createMappingTagSession } from "./mapping";
import { createMemory } from "./memory";
import { createOrganization } from "./organization";
import { createSession } from "./session";
import { createTag } from "./tag";
import { createTemplate } from "./template";
import { generateTranscript } from "./transcript";

export { createCalendar } from "./calendar";
export { createChatGroup, createChatMessage } from "./chat";
export { createEvent } from "./event";
export { createFolder } from "./folder";
export { createHuman } from "./human";
export { createmappingSessionParticipant, createMappingTagSession } from "./mapping";
export { createMemory } from "./memory";
export { createOrganization } from "./organization";
export { createSession, generateEnhancedMarkdown } from "./session";
export { createTag } from "./tag";
export { createTemplate } from "./template";
export { generateTranscript } from "./transcript";

export type SeedDefinition = {
  id: string;
  label: string;
  run: (store: PersistedStore) => void;
};

export interface MockConfig {
  organizations: number;
  humansPerOrg: { min: number; max: number };
  sessionsPerHuman: { min: number; max: number };
  eventsPerHuman: { min: number; max: number };
  calendarsPerUser: number;
}

export const generateMockData = (config: MockConfig) => {
  const organizations: Record<string, Organization> = {};
  const humans: Record<string, Human> = {};
  const calendars: Record<string, Calendar> = {};
  const folders: Record<string, Folder> = {};
  const sessions: Record<string, SessionStorage> = {};
  const transcripts: Record<string, Transcript> = {};
  const words: Record<string, Word> = {};
  const events: Record<string, Event> = {};
  const mapping_session_participant: Record<string, mappingSessionParticipant> = {};
  const tags: Record<string, Tag> = {};
  const mapping_tag_session: Record<string, MappingTagSession> = {};
  const templates: Record<string, TemplateStorage> = {};
  const chat_groups: Record<string, ChatGroup> = {};
  const chat_messages: Record<string, ChatMessageStorage> = {};
  const memories: Record<string, MemoryStorage> = {};

  const orgIds = Array.from({ length: config.organizations }, () => {
    const org = createOrganization();
    organizations[org.id] = org.data;
    return org.id;
  });

  const calendarIds = Array.from({ length: config.calendarsPerUser }, () => {
    const calendar = createCalendar();
    calendars[calendar.id] = calendar.data;
    return calendar.id;
  });

  const humanIds: string[] = [];

  if (orgIds.length > 0) {
    const currentUser = createHuman(orgIds[0], true);
    humans[currentUser.id] = currentUser.data;
    humanIds.push(currentUser.id);
  }

  orgIds.forEach((orgId) => {
    const humanCount = faker.number.int({
      min: config.humansPerOrg.min,
      max: config.humansPerOrg.max,
    });

    Array.from({ length: humanCount }, () => {
      const human = createHuman(orgId, false);
      humans[human.id] = human.data;
      humanIds.push(human.id);
    });
  });

  const eventsByHuman: Record<string, Array<{ id: string; data: Event }>> = {};
  humanIds.forEach((humanId) => {
    const eventCount = faker.number.int({
      min: config.eventsPerHuman.min,
      max: config.eventsPerHuman.max,
    });

    eventsByHuman[humanId] = [];
    Array.from({ length: eventCount }, () => {
      const calendar_id = faker.helpers.arrayElement(calendarIds);
      const event = createEvent(calendar_id);
      events[event.id] = event.data;
      eventsByHuman[humanId].push(event);
    });
  });

  const now = new Date();

  const rootFolderIds = Array.from({ length: 3 }, () => {
    const folder = createFolder();
    folders[folder.id] = folder.data;
    return folder.id;
  });

  const subFolderIds: string[] = [];
  rootFolderIds.forEach((rootId) => {
    const subFolderCount = faker.number.int({ min: 0, max: 3 });
    Array.from({ length: subFolderCount }, () => {
      const subFolder = createFolder(rootId);
      folders[subFolder.id] = subFolder.data;
      subFolderIds.push(subFolder.id);
    });
  });

  const allFolderIds = [...rootFolderIds, ...subFolderIds];

  const tagIds = Array.from({ length: 8 }, () => {
    const tag = createTag();
    tags[tag.id] = tag.data;
    return tag.id;
  });

  Array.from({ length: 5 }, () => {
    const template = createTemplate();
    templates[template.id] = template.data;
  });

  const sessionIds: string[] = [];
  humanIds.forEach((humanId) => {
    const sessionCount = faker.number.int({
      min: config.sessionsPerHuman.min,
      max: config.sessionsPerHuman.max,
    });

    const humanEvents = eventsByHuman[humanId] || [];
    const endedEvents = humanEvents.filter(
      (e) => new Date(e.data.ended_at) < now,
    );

    Array.from({ length: sessionCount }, () => {
      const shouldLinkToEvent = endedEvents.length > 0 && faker.datatype.boolean({ probability: 0.6 });
      const shouldAddToFolder = allFolderIds.length > 0 && faker.datatype.boolean({ probability: 0.6 });

      const eventId = shouldLinkToEvent ? faker.helpers.arrayElement(endedEvents).id : undefined;
      const folderId = shouldAddToFolder ? faker.helpers.arrayElement(allFolderIds) : undefined;

      const session = createSession(eventId, folderId);
      sessions[session.id] = session.data;
      sessionIds.push(session.id);

      const transcriptId = id();
      transcripts[transcriptId] = {
        user_id: DEFAULT_USER_ID,
        session_id: session.id,
        created_at: faker.date.recent({ days: 30 }).toISOString(),
      };

      const transcript = generateTranscript();
      transcript.words.forEach((word) => {
        const wordId = id();
        words[wordId] = {
          user_id: DEFAULT_USER_ID,
          transcript_id: transcriptId,
          text: word.text,
          start_ms: word.start_ms,
          end_ms: word.end_ms,
          channel: word.channel,
          created_at: faker.date.recent({ days: 30 }).toISOString(),
        };
      });
    });
  });

  sessionIds.forEach((sessionId) => {
    const participantCount = faker.number.int({ min: 1, max: 4 });
    const selectedHumans = faker.helpers.arrayElements(humanIds, participantCount);

    selectedHumans.forEach((humanId) => {
      const mapping = createmappingSessionParticipant(sessionId, humanId);
      mapping_session_participant[mapping.id] = mapping.data;
    });
  });

  sessionIds.forEach((sessionId) => {
    const shouldTag = faker.datatype.boolean({ probability: 0.6 });
    if (shouldTag) {
      const tagCount = faker.number.int({ min: 1, max: 3 });
      const selectedTags = faker.helpers.arrayElements(tagIds, tagCount);
      selectedTags.forEach((tagId) => {
        const mapping = createMappingTagSession(tagId, sessionId);
        mapping_tag_session[mapping.id] = mapping.data;
      });
    }
  });

  const chatGroupIds = Array.from({ length: 5 }, () => {
    const group = createChatGroup();
    chat_groups[group.id] = group.data;
    return group.id;
  });

  chatGroupIds.forEach((groupId) => {
    const messageCount = faker.number.int({ min: 3, max: 10 });
    Array.from({ length: messageCount }, (_, i) => {
      const role = i % 2 === 0 ? "user" : "assistant";
      const message = createChatMessage(groupId, role);
      chat_messages[message.id] = message.data;
    });
  });

  Array.from({ length: 8 }, () => {
    const term = faker.word.words({ count: { min: 1, max: 2 } });
    const memory = createMemory("vocab", term);
    memories[memory.id] = memory.data;
  });

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
  };
};

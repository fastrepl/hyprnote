import { faker } from "@faker-js/faker";

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
  WordStorage,
} from "../../../store/tinybase/main";
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

export const buildOrganizations = (count: number): Record<string, Organization> => {
  const organizations: Record<string, Organization> = {};

  for (let i = 0; i < count; i++) {
    const org = createOrganization();
    organizations[org.id] = org.data;
  }

  return organizations;
};

export const buildCalendars = (count: number): Record<string, Calendar> => {
  const calendars: Record<string, Calendar> = {};

  for (let i = 0; i < count; i++) {
    const calendar = createCalendar();
    calendars[calendar.id] = calendar.data;
  }

  return calendars;
};

export const buildHumans = (
  orgIds: string[],
  options: { includeCurrentUser?: boolean; countPerOrg: { min: number; max: number } } = {
    includeCurrentUser: true,
    countPerOrg: { min: 2, max: 5 },
  },
): Record<string, Human> => {
  const humans: Record<string, Human> = {};

  if (options.includeCurrentUser && orgIds.length > 0) {
    const currentUser = createHuman(orgIds[0], true);
    humans[currentUser.id] = currentUser.data;
  }

  orgIds.forEach((orgId) => {
    const humanCount = faker.number.int(options.countPerOrg);

    for (let i = 0; i < humanCount; i++) {
      const human = createHuman(orgId, false);
      humans[human.id] = human.data;
    }
  });

  return humans;
};

export const buildEvents = (
  calendarIds: string[],
  count: { min: number; max: number },
): Record<string, Event> => {
  const events: Record<string, Event> = {};
  const eventCount = faker.number.int(count);

  for (let i = 0; i < eventCount; i++) {
    const calendar_id = faker.helpers.arrayElement(calendarIds);
    const event = createEvent(calendar_id);
    events[event.id] = event.data;
  }

  return events;
};

export const buildEventsByHuman = (
  humanIds: string[],
  calendarIds: string[],
  countPerHuman: { min: number; max: number },
): { events: Record<string, Event>; eventsByHuman: Record<string, string[]> } => {
  const events: Record<string, Event> = {};
  const eventsByHuman: Record<string, string[]> = {};

  humanIds.forEach((humanId) => {
    const eventCount = faker.number.int(countPerHuman);
    eventsByHuman[humanId] = [];

    for (let i = 0; i < eventCount; i++) {
      const calendar_id = faker.helpers.arrayElement(calendarIds);
      const event = createEvent(calendar_id);
      events[event.id] = event.data;
      eventsByHuman[humanId].push(event.id);
    }
  });

  return { events, eventsByHuman };
};

export const buildFolders = (
  rootCount: number,
  subFoldersPerRoot: { min: number; max: number },
): Record<string, Folder> => {
  const folders: Record<string, Folder> = {};

  const rootFolderIds: string[] = [];
  for (let i = 0; i < rootCount; i++) {
    const folder = createFolder();
    folders[folder.id] = folder.data;
    rootFolderIds.push(folder.id);
  }

  rootFolderIds.forEach((rootId) => {
    const subFolderCount = faker.number.int(subFoldersPerRoot);
    for (let i = 0; i < subFolderCount; i++) {
      const subFolder = createFolder(rootId);
      folders[subFolder.id] = subFolder.data;
    }
  });

  return folders;
};

export const buildTags = (count: number): Record<string, Tag> => {
  const tags: Record<string, Tag> = {};

  for (let i = 0; i < count; i++) {
    const tag = createTag();
    tags[tag.id] = tag.data;
  }

  return tags;
};

export const buildTemplates = (count: number): Record<string, TemplateStorage> => {
  const templates: Record<string, TemplateStorage> = {};

  for (let i = 0; i < count; i++) {
    const template = createTemplate();
    templates[template.id] = template.data;
  }

  return templates;
};

export const buildSessions = (
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
    const shouldLinkToEvent = eventIds.length > 0 && faker.datatype.boolean({ probability: eventLinkProbability });
    const shouldAddToFolder = folderIds.length > 0 && faker.datatype.boolean({ probability: folderProbability });

    const eventId = shouldLinkToEvent ? faker.helpers.arrayElement(eventIds) : undefined;
    const folderId = shouldAddToFolder ? faker.helpers.arrayElement(folderIds) : undefined;

    const session = createSession(eventId, folderId);
    sessions[session.id] = session.data;
  }

  return sessions;
};

export const buildSessionsPerHuman = (
  humanIds: string[],
  sessionsPerHuman: { min: number; max: number },
  options: {
    eventsByHuman?: Record<string, string[]>;
    folderIds?: string[];
    eventLinkProbability?: number;
    folderProbability?: number;
  } = {},
): Record<string, SessionStorage> => {
  const sessions: Record<string, SessionStorage> = {};
  const {
    eventsByHuman = {},
    folderIds = [],
    eventLinkProbability = 0.6,
    folderProbability = 0.6,
  } = options;

  humanIds.forEach((humanId) => {
    const sessionCount = faker.number.int(sessionsPerHuman);
    const humanEventIds = eventsByHuman[humanId] || [];

    for (let i = 0; i < sessionCount; i++) {
      const shouldLinkToEvent = humanEventIds.length > 0
        && faker.datatype.boolean({ probability: eventLinkProbability });
      const shouldAddToFolder = folderIds.length > 0 && faker.datatype.boolean({ probability: folderProbability });

      const eventId = shouldLinkToEvent ? faker.helpers.arrayElement(humanEventIds) : undefined;
      const folderId = shouldAddToFolder ? faker.helpers.arrayElement(folderIds) : undefined;

      const session = createSession(eventId, folderId);
      sessions[session.id] = session.data;
    }
  });

  return sessions;
};

export const buildTranscriptsForSessions = (
  sessionIds: string[],
): {
  transcripts: Record<string, Transcript>;
  words: Record<string, WordStorage>;
} => {
  const transcripts: Record<string, Transcript> = {};
  const words: Record<string, WordStorage> = {};

  sessionIds.forEach((sessionId) => {
    const transcriptId = id();
    const createdAt = faker.date.recent({ days: 30 });
    transcripts[transcriptId] = {
      user_id: DEFAULT_USER_ID,
      session_id: sessionId,
      created_at: createdAt.toISOString(),
      started_at: createdAt.getTime(),
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

  return { transcripts, words };
};

export const buildSessionParticipants = (
  sessionIds: string[],
  humanIds: string[],
  participantsPerSession: { min: number; max: number },
): Record<string, mappingSessionParticipant> => {
  const mapping_session_participant: Record<string, mappingSessionParticipant> = {};

  sessionIds.forEach((sessionId) => {
    const participantCount = faker.number.int(participantsPerSession);
    const selectedHumans = faker.helpers.arrayElements(humanIds, participantCount);

    selectedHumans.forEach((humanId) => {
      const mapping = createmappingSessionParticipant(sessionId, humanId);
      mapping_session_participant[mapping.id] = mapping.data;
    });
  });

  return mapping_session_participant;
};

export const buildSessionTags = (
  sessionIds: string[],
  tagIds: string[],
  options: {
    tagProbability?: number;
    tagsPerSession?: { min: number; max: number };
  } = {},
): Record<string, MappingTagSession> => {
  const mapping_tag_session: Record<string, MappingTagSession> = {};
  const { tagProbability = 0.6, tagsPerSession = { min: 1, max: 3 } } = options;

  sessionIds.forEach((sessionId) => {
    const shouldTag = faker.datatype.boolean({ probability: tagProbability });
    if (shouldTag) {
      const tagCount = faker.number.int(tagsPerSession);
      const selectedTags = faker.helpers.arrayElements(tagIds, tagCount);
      selectedTags.forEach((tagId) => {
        const mapping = createMappingTagSession(tagId, sessionId);
        mapping_tag_session[mapping.id] = mapping.data;
      });
    }
  });

  return mapping_tag_session;
};

export const buildChatGroups = (count: number): Record<string, ChatGroup> => {
  const chat_groups: Record<string, ChatGroup> = {};

  for (let i = 0; i < count; i++) {
    const group = createChatGroup();
    chat_groups[group.id] = group.data;
  }

  return chat_groups;
};

export const buildChatMessages = (
  groupIds: string[],
  messagesPerGroup: { min: number; max: number },
): Record<string, ChatMessageStorage> => {
  const chat_messages: Record<string, ChatMessageStorage> = {};

  groupIds.forEach((groupId) => {
    const messageCount = faker.number.int(messagesPerGroup);
    for (let i = 0; i < messageCount; i++) {
      const role = i % 2 === 0 ? "user" : "assistant";
      const message = createChatMessage(groupId, role);
      chat_messages[message.id] = message.data;
    }
  });

  return chat_messages;
};

export const buildMemories = (
  type: string,
  count: number,
  textGenerator?: () => string,
): Record<string, MemoryStorage> => {
  const memories: Record<string, MemoryStorage> = {};

  for (let i = 0; i < count; i++) {
    const term = textGenerator
      ? textGenerator()
      : faker.word.words({ count: { min: 1, max: 2 } });
    const memory = createMemory(type, term);
    memories[memory.id] = memory.data;
  }

  return memories;
};

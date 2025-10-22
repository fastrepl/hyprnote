import { faker } from "@faker-js/faker";

import type { Store as PersistedStore } from "../../store/tinybase/persisted";
import type {
  Calendar,
  ChatGroup,
  ChatMessageStorage,
  Event,
  Folder,
  Human,
  mappingSessionParticipant,
  MappingTagSession,
  Organization,
  SessionStorage,
  Tag,
  TemplateStorage,
  Transcript,
  Word,
} from "../../store/tinybase/persisted";
import { id } from "../../utils";

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

export const USER_ID = "00000000-0000-0000-0000-000000000000";

export const createOrganization = () => ({
  id: id(),
  data: {
    user_id: USER_ID,
    name: faker.company.name(),
    created_at: faker.date.past({ years: 2 }).toISOString(),
  } satisfies Organization,
});

export const createHuman = (org_id: string, isUser = false) => {
  const sex = faker.person.sexType();
  const firstName = faker.person.firstName(sex);
  const lastName = faker.person.lastName();

  const jobTitles = [
    "Software Engineer",
    "Product Manager",
    "Designer",
    "Engineering Manager",
    "CEO",
    "CTO",
    "VP of Engineering",
    "Data Scientist",
    "Marketing Manager",
    "Sales Director",
    "Account Executive",
    "Customer Success Manager",
    "Operations Manager",
    "HR Manager",
  ];

  return {
    id: id(),
    data: {
      user_id: USER_ID,
      name: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }),
      job_title: faker.helpers.arrayElement(jobTitles),
      linkedin_username: faker.datatype.boolean({ probability: 0.7 })
        ? `${firstName.toLowerCase()}${lastName.toLowerCase()}`
        : undefined,
      is_user: isUser,
      created_at: faker.date.past({ years: 1 }).toISOString(),
      org_id,
    } satisfies Human,
  };
};

export const createCalendar = () => {
  const template = faker.helpers.arrayElement([
    "Work Calendar",
    "Personal Calendar",
    "Team Calendar",
    "Project Calendar",
    "Meetings",
    "Events & Conferences",
    "Family Calendar",
    `${faker.company.name()} Calendar`,
    `${faker.commerce.department()} Team`,
    "Shared Calendar",
  ]);

  return {
    id: id(),
    data: {
      user_id: USER_ID,
      name: template,
      created_at: faker.date.past({ years: 1 }).toISOString(),
    } satisfies Calendar,
  };
};

export const generateTitle = () => {
  const lengthConfig = faker.helpers.weightedArrayElement([
    { weight: 40, value: { min: 2, max: 4 } },
    { weight: 35, value: { min: 4, max: 6 } },
    { weight: 15, value: { min: 6, max: 9 } },
    { weight: 8, value: { min: 9, max: 12 } },
    { weight: 2, value: { min: 12, max: 15 } },
  ]);

  const wordCount = faker.number.int(lengthConfig);
  return faker.lorem.sentence(wordCount);
};

export const generateEnhancedMarkdown = () => {
  const sections: string[] = [];
  const sectionCount = faker.number.int({ min: 3, max: 8 });

  for (let i = 0; i < sectionCount; i++) {
    const heading = faker.lorem.sentence({ min: 2, max: 5 });
    sections.push(`## ${heading}\n`);

    const bulletCount = faker.number.int({ min: 2, max: 5 });
    const bullets = faker.helpers.multiple(
      () => `- ${faker.lorem.sentence()}`,
      { count: bulletCount },
    );
    sections.push(bullets.join("\n"));
    sections.push("\n\n");
  }

  const mainHeading = faker.lorem.words({ min: 2, max: 4 });
  return `# ${mainHeading}\n\n${sections.join("")}`;
};

export const generateTranscript = () => {
  const wordCount = faker.number.int({ min: 50, max: 200 });
  const words: Array<Word> = [];

  let currentTimeMs = 0;

  for (let i = 0; i < wordCount; i++) {
    const word = faker.lorem.word();
    const durationMs = faker.number.int({ min: 200, max: 800 });

    words.push({
      user_id: USER_ID,
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

export const createSession = (eventId?: string, folderId?: string): { id: string; data: SessionStorage } => {
  const title = generateTitle();
  const raw_md = faker.lorem.paragraphs(faker.number.int({ min: 2, max: 5 }), "\n\n");
  const enhanced_md = generateEnhancedMarkdown();

  return {
    id: id(),
    data: {
      user_id: USER_ID,
      title,
      raw_md,
      enhanced_md,
      created_at: faker.date.recent({ days: 30 }).toISOString(),
      event_id: eventId,
      folder_id: folderId,
    },
  };
};

export const createFolder = (parentFolderId?: string) => ({
  id: id(),
  data: {
    user_id: USER_ID,
    name: faker.system.directoryPath().split("/").pop() || faker.lorem.word(),
    parent_folder_id: parentFolderId,
    created_at: faker.date.past({ years: 1 }).toISOString(),
  } satisfies Folder,
});

export const createmappingSessionParticipant = (session_id: string, human_id: string) => ({
  id: id(),
  data: {
    user_id: USER_ID,
    session_id,
    human_id,
    created_at: faker.date.recent({ days: 30 }).toISOString(),
  } satisfies mappingSessionParticipant,
});

export const createTag = () => ({
  id: id(),
  data: {
    user_id: USER_ID,
    name: faker.helpers.arrayElement([
      "Work",
      "Personal",
      "Meeting",
      "Project",
      "Research",
      "Important",
      "Follow-up",
      "Review",
    ]),
    created_at: faker.date.past({ years: 1 }).toISOString(),
  } satisfies Tag,
});

export const createMappingTagSession = (tag_id: string, session_id: string) => ({
  id: id(),
  data: {
    user_id: USER_ID,
    tag_id,
    session_id,
    created_at: faker.date.recent({ days: 30 }).toISOString(),
  } satisfies MappingTagSession,
});

export const createTemplate = (
  templateType?: "meeting" | "standup" | "retrospective" | "interview" | "sales",
): { id: string; data: TemplateStorage } => {
  const templates = {
    meeting: {
      title: "Team Meeting",
      description: "Standard template for team meetings. Captures key discussion points, decisions, and action items.",
      sections: [
        { title: "Meeting Overview", description: "Brief summary of the meeting purpose and attendees" },
        { title: "Key Discussion Points", description: "Main topics discussed during the meeting" },
        { title: "Decisions Made", description: "Important decisions and their rationale" },
        { title: "Action Items", description: "Tasks assigned with owners and deadlines" },
        { title: "Next Steps", description: "Follow-up actions and next meeting plans" },
      ],
    },
    standup: {
      title: "Daily Standup",
      description: "Quick daily sync template for agile teams. Focuses on progress, plans, and blockers.",
      sections: [
        { title: "Yesterday's Progress", description: "What was completed yesterday" },
        { title: "Today's Plan", description: "What will be worked on today" },
        { title: "Blockers", description: "Any impediments or help needed" },
        { title: "Team Updates", description: "Important announcements or updates" },
      ],
    },
    retrospective: {
      title: "Sprint Retrospective",
      description: "Reflection template for sprint retrospectives. Helps teams improve their processes.",
      sections: [
        { title: "What Went Well", description: "Positive aspects and successes from the sprint" },
        { title: "What Could Be Improved", description: "Challenges and areas for improvement" },
        { title: "Action Items", description: "Concrete steps to improve in the next sprint" },
        { title: "Team Metrics", description: "Sprint velocity and other key metrics" },
      ],
    },
    interview: {
      title: "Candidate Interview",
      description: "Structured interview template for consistent candidate evaluation.",
      sections: [
        { title: "Candidate Background", description: "Summary of candidate's experience and qualifications" },
        { title: "Technical Skills", description: "Assessment of technical abilities and knowledge" },
        { title: "Cultural Fit", description: "Evaluation of alignment with company values" },
        { title: "Questions Asked", description: "Questions the candidate asked about the role" },
        { title: "Overall Assessment", description: "Final recommendation and next steps" },
      ],
    },
    sales: {
      title: "Sales Discovery Call",
      description: "Template for initial sales calls to understand customer needs and qualify leads.",
      sections: [
        { title: "Company Overview", description: "Brief background on the prospect's company" },
        { title: "Pain Points", description: "Current challenges and problems they're facing" },
        { title: "Goals & Objectives", description: "What they're trying to achieve" },
        { title: "Budget & Timeline", description: "Financial capacity and decision timeline" },
        { title: "Next Steps", description: "Follow-up actions and proposal timeline" },
      ],
    },
  };

  // If no type specified, pick a random one
  const type = templateType
    || faker.helpers.arrayElement(["meeting", "standup", "retrospective", "interview", "sales"] as const);

  const templateData = templates[type];

  return {
    id: id(),
    data: {
      user_id: USER_ID,
      title: templateData.title,
      description: templateData.description,
      sections: JSON.stringify(templateData.sections),
      created_at: faker.date.past({ years: 1 }).toISOString(),
    },
  };
};

export const createChatGroup = () => ({
  id: id(),
  data: {
    user_id: USER_ID,
    created_at: faker.date.recent({ days: 30 }).toISOString(),
    title: faker.lorem.words({ min: 2, max: 5 }),
  } satisfies ChatGroup,
});

export const createChatMessage = (
  chat_group_id: string,
  role: "user" | "assistant",
): { id: string; data: ChatMessageStorage } => ({
  id: id(),
  data: {
    user_id: USER_ID,
    chat_group_id,
    role,
    content: faker.lorem.sentences({ min: 1, max: 3 }),
    created_at: faker.date.recent({ days: 30 }).toISOString(),
    metadata: JSON.stringify({}),
    parts: JSON.stringify([]),
  },
});

export const createEvent = (calendar_id: string) => {
  const timePattern = faker.helpers.weightedArrayElement([
    { weight: 5, value: "last-year" },
    { weight: 15, value: "past-two-weeks" },
    { weight: 10, value: "today" },
    { weight: 15, value: "next-few-days" },
    { weight: 15, value: "next-two-weeks" },
  ]);

  let startsAt: Date;
  const now = faker.defaultRefDate();

  switch (timePattern) {
    case "last-year":
      const daysLastYear = faker.number.int({ min: 180, max: 365 });
      startsAt = new Date(now.getTime() - daysLastYear * 24 * 60 * 60 * 1000);
      break;

    case "past-two-weeks":
      const daysPast = faker.number.int({ min: 1, max: 14 });
      startsAt = new Date(now.getTime() - daysPast * 24 * 60 * 60 * 1000);
      break;

    case "today":
      const hoursToday = faker.number.float({ min: -12, max: 12, fractionDigits: 1 });
      startsAt = new Date(now.getTime() + hoursToday * 60 * 60 * 1000);
      break;

    case "next-few-days":
      const daysNext = faker.number.int({ min: 1, max: 7 });
      startsAt = new Date(now.getTime() + daysNext * 24 * 60 * 60 * 1000);
      break;

    case "next-two-weeks":
      const daysLater = faker.number.int({ min: 8, max: 14 });
      startsAt = new Date(now.getTime() + daysLater * 24 * 60 * 60 * 1000);
      break;

    default:
      startsAt = faker.date.soon({ days: 7 });
  }

  const durationHours = faker.number.float({ min: 0.25, max: 4, fractionDigits: 2 });
  const endsAt = new Date(startsAt.getTime() + durationHours * 60 * 60 * 1000);

  const meetingType = faker.helpers.weightedArrayElement([
    { weight: 50, value: "online" },
    { weight: 30, value: "offline" },
    { weight: 20, value: "hybrid" },
  ]);

  const videoProviders = [
    { domain: "zoom.us", name: "Zoom" },
    { domain: "meet.google.com", name: "Google Meet" },
    { domain: "teams.microsoft.com", name: "Microsoft Teams" },
    { domain: "whereby.com", name: "Whereby" },
    { domain: "around.co", name: "Around" },
  ];

  const locations = [
    "Conference Room A",
    "Conference Room B",
    "Main Office - 3rd Floor",
    "Starbucks Downtown",
    "WeWork Coworking Space",
    "Client Office",
    "HQ Building 2",
    "Meeting Room Delta",
    "Cafeteria",
    "Rooftop Lounge",
  ];

  let meeting_link: string | undefined;
  let location: string | undefined;
  let description: string | undefined;

  if (meetingType === "online" || meetingType === "hybrid") {
    const provider = faker.helpers.arrayElement(videoProviders);
    const meetingId = faker.string.alphanumeric(10);
    meeting_link = `https://${provider.domain}/${meetingId}`;
  }

  if (meetingType === "offline" || meetingType === "hybrid") {
    location = faker.helpers.arrayElement(locations);
  }

  if (faker.datatype.boolean({ probability: 0.7 })) {
    description = faker.lorem.sentences(faker.number.int({ min: 1, max: 3 }));
  }

  return {
    id: id(),
    data: {
      user_id: USER_ID,
      calendar_id,
      title: generateTitle(),
      started_at: startsAt.toISOString(),
      ended_at: endsAt.toISOString(),
      created_at: faker.date.recent({ days: 30 }).toISOString(),
      location,
      meeting_link,
      description,
    } satisfies Event,
  };
};

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

  // Create one of each template type for better demonstration
  const templateTypes: Array<"meeting" | "standup" | "retrospective" | "interview" | "sales"> = [
    "meeting",
    "standup",
    "retrospective",
    "interview",
    "sales",
  ];

  templateTypes.forEach((type) => {
    const template = createTemplate(type);
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
        user_id: USER_ID,
        session_id: session.id,
        created_at: faker.date.recent({ days: 30 }).toISOString(),
      };

      const transcript = generateTranscript();
      transcript.words.forEach((word) => {
        const wordId = id();
        words[wordId] = {
          user_id: USER_ID,
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
  };
};

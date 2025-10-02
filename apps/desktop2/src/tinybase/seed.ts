import { faker } from "@faker-js/faker";
import type { Tables } from "tinybase/with-schemas";

import { id } from "../utils";
import type { Calendar, Event, Human, MappingEventParticipant, Organization, Schemas, Session } from "./store/persisted";

interface MockConfig {
  organizations: number;
  humansPerOrg: { min: number; max: number };
  sessionsPerHuman: { min: number; max: number };
  eventsPerHuman: { min: number; max: number };
  calendarsPerUser: number;
}

const USER_ID = id();

const createOrganization = () => ({
  id: id(),
  data: {
    user_id: USER_ID,
    name: faker.company.name(),
    created_at: faker.date.past({ years: 2 }).toISOString(),
  } satisfies Organization,
});

const createHuman = (org_id: string) => {
  const sex = faker.person.sexType();
  const firstName = faker.person.firstName(sex);
  const lastName = faker.person.lastName();

  return {
    id: id(),
    data: {
      user_id: USER_ID,
      name: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }),
      created_at: faker.date.past({ years: 1 }).toISOString(),
      org_id,
    } satisfies Human,
  };
};

const createCalendar = () => {
  const template = faker.helpers.arrayElement([
    `${faker.commerce.product()} Meeting`,
    `${faker.commerce.product()} Sync`,
    `${faker.commerce.product()} Planning`,
    `${faker.commerce.product()} Review`,
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

const generateTitle = () => {
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

const generateEnhancedMarkdown = () => {
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

const generateTranscript = () => {
  const wordCount = faker.number.int({ min: 50, max: 200 });
  const words: Array<{ speaker: string; text: string; start: string; end: string }> = [];
  const speakers = ["Speaker 1", "Speaker 2"];

  const baseTime = faker.date.recent({ days: 30 });
  let currentTime = baseTime.getTime();

  for (let i = 0; i < wordCount; i++) {
    const word = faker.lorem.word();
    const durationMs = faker.number.int({ min: 200, max: 800 });

    words.push({
      speaker: faker.helpers.arrayElement(speakers),
      text: word,
      start: new Date(currentTime).toISOString(),
      end: new Date(currentTime + durationMs).toISOString(),
    });

    currentTime += durationMs + faker.number.int({ min: 50, max: 300 });
  }

  return { words };
};

const createSession = (eventId?: string) => {
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
      event_id: eventId || null,
      transcript: generateTranscript(),
    } satisfies Session,
  };
};

const createMappingEventParticipant = (event_id: string, human_id: string) => ({
  id: id(),
  data: {
    user_id: USER_ID,
    event_id,
    human_id,
    created_at: faker.date.recent({ days: 30 }).toISOString(),
  } satisfies MappingEventParticipant,
});

const createEvent = (calendar_id: string) => {
  const timePattern = faker.helpers.weightedArrayElement([
    { weight: 10, value: "past-recent" },
    { weight: 5, value: "past-older" },
    { weight: 15, value: "imminent" },
    { weight: 25, value: "today-tomorrow" },
    { weight: 20, value: "this-week" },
    { weight: 15, value: "next-few-weeks" },
    { weight: 10, value: "distant" },
  ]);

  let startsAt: Date;
  const now = faker.defaultRefDate();

  switch (timePattern) {
    case "past-recent":
      const daysAgo = faker.number.int({ min: 1, max: 7 });
      startsAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      break;

    case "past-older":
      const weeksAgo = faker.number.int({ min: 1, max: 4 });
      startsAt = new Date(now.getTime() - weeksAgo * 7 * 24 * 60 * 60 * 1000);
      break;

    case "imminent":
      const minutes = faker.helpers.arrayElement([5, 10, 15, 30, 45, 60, 90, 120]);
      startsAt = new Date(now.getTime() + minutes * 60 * 1000);
      break;

    case "today-tomorrow":
      const hoursAhead = faker.number.float({ min: 0.5, max: 36, fractionDigits: 1 });
      startsAt = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
      break;

    case "this-week":
      const daysAhead = faker.number.int({ min: 2, max: 7 });
      startsAt = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
      break;

    case "next-few-weeks":
      const weeksAhead = faker.number.int({ min: 1, max: 3 });
      const extraDays = faker.number.int({ min: 0, max: 6 });
      startsAt = new Date(now.getTime() + (weeksAhead * 7 + extraDays) * 24 * 60 * 60 * 1000);
      break;

    case "distant":
      const monthsAhead = faker.number.float({ min: 1, max: 3, fractionDigits: 1 });
      startsAt = new Date(now.getTime() + monthsAhead * 30 * 24 * 60 * 60 * 1000);
      break;

    default:
      startsAt = faker.date.soon({ days: 7 });
  }

  const durationHours = faker.number.float({ min: 0.25, max: 4, fractionDigits: 2 });
  const endsAt = new Date(startsAt.getTime() + durationHours * 60 * 60 * 1000);

  return {
    id: id(),
    data: {
      user_id: USER_ID,
      calendar_id,
      title: generateTitle(),
      started_at: startsAt.toISOString(),
      ended_at: endsAt.toISOString(),
      created_at: faker.date.recent({ days: 30 }).toISOString(),
    } satisfies Event,
  };
};

const generateMockData = (config: MockConfig) => {
  const organizations: Record<string, any> = {};
  const humans: Record<string, any> = {};
  const calendars: Record<string, any> = {};
  const sessions: Record<string, any> = {};
  const events: Record<string, any> = {};
  const mapping_event_participant: Record<string, any> = {};

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
  orgIds.forEach((orgId) => {
    const humanCount = faker.number.int({
      min: config.humansPerOrg.min,
      max: config.humansPerOrg.max,
    });

    Array.from({ length: humanCount }, () => {
      const human = createHuman(orgId);
      humans[human.id] = human.data;
      humanIds.push(human.id);
    });
  });

  const eventsByHuman: Record<string, Array<{ id: string; data: any }>> = {};
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

      // Create mapping entry
      const mapping = createMappingEventParticipant(event.id, humanId);
      mapping_event_participant[mapping.id] = mapping.data;
    });
  });

  const now = new Date();

  humanIds.forEach((humanId) => {
    const sessionCount = faker.number.int({
      min: config.sessionsPerHuman.min,
      max: config.sessionsPerHuman.max,
    });

    const humanEvents = eventsByHuman[humanId] || [];
    const endedEvents = humanEvents.filter(
      (e) => new Date(e.data.endsAt) < now,
    );

    Array.from({ length: sessionCount }, () => {
      const shouldLinkToEvent = endedEvents.length > 0 && faker.datatype.boolean({ probability: 0.5 });

      if (shouldLinkToEvent) {
        const linkedEvent = faker.helpers.arrayElement(endedEvents);
        const session = createSession(linkedEvent.id);
        sessions[session.id] = session.data;
      } else {
        const session = createSession();
        sessions[session.id] = session.data;
      }
    });
  });

  return {
    organizations,
    humans,
    calendars,
    sessions,
    events,
    mapping_event_participant,
  };
};

faker.seed(123);

export const V1 = generateMockData({
  organizations: 5,
  humansPerOrg: { min: 3, max: 8 },
  sessionsPerHuman: { min: 2, max: 6 },
  eventsPerHuman: { min: 1, max: 5 },
  calendarsPerUser: 3,
}) satisfies Tables<Schemas[0]>;

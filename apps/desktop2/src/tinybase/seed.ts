import { faker } from "@faker-js/faker";
import type { Tables } from "tinybase/with-schemas";

import { id } from "../utils";
import type { Schemas } from "./store/hybrid";

interface MockConfig {
  organizations: number;
  humansPerOrg: { min: number; max: number };
  sessionsPerHuman: { min: number; max: number };
  eventsPerHuman: { min: number; max: number };
}

const createOrganization = () => ({
  id: id(),
  data: {
    name: faker.company.name(),
    createdAt: faker.date.past({ years: 2 }).toISOString(),
  },
});

const createHuman = (orgId: string) => {
  const sex = faker.person.sexType();
  const firstName = faker.person.firstName(sex);
  const lastName = faker.person.lastName();

  return {
    id: id(),
    data: {
      name: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }),
      createdAt: faker.date.past({ years: 1 }).toISOString(),
      orgId,
    },
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

const createSession = (humanId: string) => {
  const title = generateTitle();
  const raw_md = faker.lorem.paragraphs(faker.number.int({ min: 2, max: 5 }), "\n\n");
  const enhanced_md = generateEnhancedMarkdown();

  return {
    id: id(),
    data: {
      title,
      raw_md,
      enhanced_md,
      createdAt: faker.date.recent({ days: 30 }).toISOString(),
      humanId,
    },
  };
};

const createEvent = (humanId: string) => {
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
      title: generateTitle(),
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      humanId,
    },
  };
};

const generateMockData = (config: MockConfig) => {
  const organizations: Record<string, any> = {};
  const humans: Record<string, any> = {};
  const sessions: Record<string, any> = {};
  const events: Record<string, any> = {};

  const orgIds = Array.from({ length: config.organizations }, () => {
    const org = createOrganization();
    organizations[org.id] = org.data;
    return org.id;
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

  humanIds.forEach((humanId) => {
    const sessionCount = faker.number.int({
      min: config.sessionsPerHuman.min,
      max: config.sessionsPerHuman.max,
    });

    Array.from({ length: sessionCount }, () => {
      const session = createSession(humanId);
      sessions[session.id] = session.data;
    });
  });

  humanIds.forEach((humanId) => {
    const eventCount = faker.number.int({
      min: config.eventsPerHuman.min,
      max: config.eventsPerHuman.max,
    });

    Array.from({ length: eventCount }, () => {
      const event = createEvent(humanId);
      events[event.id] = event.data;
    });
  });

  return {
    organizations,
    humans,
    sessions,
    events,
  };
};

faker.seed(123);

export const V1 = generateMockData({
  organizations: 5,
  humansPerOrg: { min: 3, max: 8 },
  sessionsPerHuman: { min: 2, max: 6 },
  eventsPerHuman: { min: 1, max: 5 },
}) satisfies Tables<Schemas[0]>;

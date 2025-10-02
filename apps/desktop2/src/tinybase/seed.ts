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

const createSession = (humanId: string) => {
  const sentenceCount = faker.number.int({ min: 3, max: 8 });
  const title = faker.lorem.sentence(sentenceCount);

  const paragraphCount = faker.number.int({ min: 2, max: 5 });
  const sectionCount = faker.number.int({ min: 2, max: 4 });

  const sections = Array.from({ length: sectionCount }, () => {
    const heading = faker.lorem.sentence({ min: 2, max: 5 });
    const content = faker.lorem.paragraphs(paragraphCount, "\n\n");
    return `## ${heading}\n\n${content}`;
  });

  const mainHeading = faker.lorem.words({ min: 2, max: 5 });
  const raw_md = `# ${mainHeading}\n\n${sections.join("\n\n")}`;

  return {
    id: id(),
    data: {
      title,
      raw_md,
      enhanced_md: "",
      createdAt: faker.date.recent({ days: 30 }).toISOString(),
      humanId,
    },
  };
};

const createEvent = (humanId: string) => {
  const daysInFuture = faker.number.int({ min: 1, max: 30 });
  const startsAt = faker.date.soon({ days: daysInFuture });

  const durationHours = faker.number.float({ min: 0.5, max: 4, fractionDigits: 1 });
  const endsAt = new Date(startsAt.getTime() + durationHours * 60 * 60 * 1000);

  const titleWords = faker.number.int({ min: 2, max: 6 });

  return {
    id: id(),
    data: {
      title: faker.lorem.sentence(titleWords),
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
faker.setDefaultRefDate("2025-01-01T00:00:00.000Z");

export const V1 = generateMockData({
  organizations: 5,
  humansPerOrg: { min: 3, max: 8 },
  sessionsPerHuman: { min: 2, max: 6 },
  eventsPerHuman: { min: 1, max: 5 },
}) satisfies Tables<Schemas[0]>;

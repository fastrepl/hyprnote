import { faker } from "@faker-js/faker";
import type { Tables } from "tinybase/with-schemas";

import { id } from "../utils";
import type { Schemas } from "./store/hybrid";

faker.seed(123);
faker.setDefaultRefDate("2025-01-01T00:00:00.000Z");

const createOrganization = () => ({
  id: id(),
  data: {
    name: faker.company.name(),
    createdAt: faker.date.past().toISOString(),
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
      createdAt: faker.date.past().toISOString(),
      orgId,
    },
  };
};

const createSession = (humanId: string) => {
  const title = faker.lorem.sentence(3);
  return {
    id: id(),
    data: {
      title,
      raw_md: `# ${faker.lorem.words(3)}\n\n${faker.lorem.paragraphs(2)}`,
      enhanced_md: "",
      createdAt: faker.date.recent().toISOString(),
      humanId,
    },
  };
};

const createEvent = (humanId: string) => ({
  id: id(),
  data: {
    title: faker.lorem.sentence(4),
    startsAt: faker.date.soon().toISOString(),
    endsAt: faker.date.soon({ days: 1 }).toISOString(),
    humanId,
  },
});

const org1 = createOrganization();
const org2 = createOrganization();

const human1 = createHuman(org1.id);
const human2 = createHuman(org1.id);
const human3 = createHuman(org2.id);

const session1 = createSession(human1.id);
const session2 = createSession(human2.id);

const event1 = createEvent(human1.id);
const event2 = createEvent(human3.id);

export const V1 = {
  organizations: {
    [org1.id]: org1.data,
    [org2.id]: org2.data,
  },
  humans: {
    [human1.id]: human1.data,
    [human2.id]: human2.data,
    [human3.id]: human3.data,
  },
  sessions: {
    [session1.id]: session1.data,
    [session2.id]: session2.data,
  },
  events: {
    [event1.id]: event1.data,
    [event2.id]: event2.data,
  },
} satisfies Tables<Schemas[0]>;

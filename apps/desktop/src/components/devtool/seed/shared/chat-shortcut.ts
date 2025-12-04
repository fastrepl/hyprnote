import { faker } from "@faker-js/faker";

import type { ChatShortcutStorage } from "@hypr/store";

import { DEFAULT_USER_ID, id } from "../../../../utils";

export const createChatShortcut = (): {
  id: string;
  data: ChatShortcutStorage;
} => {
  return {
    id: id(),
    data: {
      user_id: DEFAULT_USER_ID,
      content: faker.lorem.sentence({ min: 3, max: 8 }),
      created_at: faker.date.past({ years: 1 }).toISOString(),
    },
  };
};

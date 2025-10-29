import { faker } from "@faker-js/faker";

import type { MemoryStorage } from "../../../store/tinybase/main";
import { DEFAULT_USER_ID, id } from "../../../utils";

export const createMemory = (type: string, text: string): { id: string; data: MemoryStorage } => {
  return {
    id: id(),
    data: {
      user_id: DEFAULT_USER_ID,
      type,
      text,
      created_at: faker.date.past({ years: 1 }).toISOString(),
    },
  };
};

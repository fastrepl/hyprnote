import { faker } from "@faker-js/faker";

import type {
  ChatGroup,
  ChatMessageStorage,
} from "../../../store/tinybase/main";
import { DEFAULT_USER_ID, id } from "../../../utils";

export const createChatGroup = () => ({
  id: id(),
  data: {
    user_id: DEFAULT_USER_ID,
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
    user_id: DEFAULT_USER_ID,
    chat_group_id,
    role,
    content: faker.lorem.sentences({ min: 1, max: 3 }),
    created_at: faker.date.recent({ days: 30 }).toISOString(),
    metadata: JSON.stringify({}),
    parts: JSON.stringify([]),
  },
});

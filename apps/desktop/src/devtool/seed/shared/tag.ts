import { faker } from "@faker-js/faker";

import type { Tag } from "../../../store/tinybase/main";
import { DEFAULT_USER_ID, id } from "../../../utils";

export const createTag = () => ({
  id: id(),
  data: {
    user_id: DEFAULT_USER_ID,
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

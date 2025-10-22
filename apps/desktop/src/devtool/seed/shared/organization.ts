import { faker } from "@faker-js/faker";

import type { Organization } from "../../../store/tinybase/persisted";
import { DEFAULT_USER_ID, id } from "../../../utils";

export const createOrganization = () => ({
  id: id(),
  data: {
    user_id: DEFAULT_USER_ID,
    name: faker.company.name(),
    created_at: faker.date.past({ years: 2 }).toISOString(),
  } satisfies Organization,
});

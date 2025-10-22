import { faker } from "@faker-js/faker";

import type { mappingSessionParticipant, MappingTagSession } from "../../../store/tinybase/persisted";
import { DEFAULT_USER_ID, id } from "../../../utils";

export const createmappingSessionParticipant = (session_id: string, human_id: string) => ({
  id: id(),
  data: {
    user_id: DEFAULT_USER_ID,
    session_id,
    human_id,
    created_at: faker.date.recent({ days: 30 }).toISOString(),
  } satisfies mappingSessionParticipant,
});

export const createMappingTagSession = (tag_id: string, session_id: string) => ({
  id: id(),
  data: {
    user_id: DEFAULT_USER_ID,
    tag_id,
    session_id,
    created_at: faker.date.recent({ days: 30 }).toISOString(),
  } satisfies MappingTagSession,
});

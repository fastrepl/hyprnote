import { faker } from "@faker-js/faker";

import type { Folder } from "@hypr/store";

import { DEFAULT_USER_ID, id } from "../../../../utils";

export const createFolder = (parentFolderId?: string) => ({
  id: id(),
  data: {
    user_id: DEFAULT_USER_ID,
    name: faker.system.directoryPath().split("/").pop() || faker.lorem.word(),
    parent_folder_id: parentFolderId,
    created_at: faker.date.past({ years: 1 }).toISOString(),
  } satisfies Folder,
});

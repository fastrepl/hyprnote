import { BlockNoteEditor } from "@blocknote/core";

import { commands as authCommands } from "@hypr/plugin-auth";
import { fetch } from "@hypr/utils";

const BASE = "https://api.twenty.com/rest";

export type Person = {
  id: string;
  avatarUrl: string;
  emails: { primaryEmail: string };
  name: { firstName: string; lastName: string };
};

type Note = {
  id: string;
  title: string;
  bodyV2: { blocknote: any };
};

export const setApiKey = async (key: string) => {
  await authCommands.setInVault("twenty-api-key", key);
};

export const getApiKey = async () => {
  if (import.meta.env.DEV && import.meta.env.VITE_TWENTY_API_KEY) {
    return import.meta.env.VITE_TWENTY_API_KEY;
  }

  const key = await authCommands.getFromVault("twenty-api-key");
  if (!key) {
    throw new Error("no_twenty_api_key");
  }

  return key;
};

// https://twenty.com/developers/rest-api/core#/operations/findManyPeople
export const findManyPeople = async (query?: string) => {
  const key = await getApiKey();

  let url = `${BASE}/people?depth=0`;

  // Only add filter if query is provided
  if (query && query.trim()) {
    // Create filters for partial matching on email field
    const filters = [
      `emails.primaryEmail[ilike]:${encodeURIComponent(`%${query}%`)}`,
      // `name.firstName[ilike]:${encodeURIComponent(`%${query}%`)}`,
      // `name.lastName[ilike]:${encodeURIComponent(`%${query}%`)}`
    ];

    // Combine filters with OR operator
    const combinedFilter = filters.join(" OR ");
    url += `&filter=${combinedFilter}`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${key}`,
    },
  });

  const { data: { people } } = await response.json();
  return people as Person[];
};

// https://twenty.com/developers/rest-api/core#/operations/createOneNote
export const createOneNote = async (title: string, body: string) => {
  const key = await getApiKey();

  const editor = BlockNoteEditor.create();
  const blocks = await editor.tryParseMarkdownToBlocks(body);

  const res = await fetch(`${BASE}/notes`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      position: 0,
      title,
      // https://github.com/twentyhq/twenty/issues/10606
      bodyV2: { blocknote: JSON.stringify(blocks) },
      createdBy: {
        source: "API",
      },
    }),
  });

  const { data } = await res.json();
  return data as Note;
};

// https://twenty.com/developers/rest-api/core#/operations/createManyNoteTargets
export const createManyNoteTargets = async (noteId: string, personIds: string[]) => {
  const key = await getApiKey();

  const response = await fetch(`${BASE}/batch/noteTargets`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(personIds.map((personId) => ({ noteId, personId }))),
  });

  const { data } = await response.json();
  return data;
};

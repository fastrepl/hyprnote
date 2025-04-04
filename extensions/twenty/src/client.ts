import { BlockNoteEditor } from "@blocknote/core";

import { commands as authCommands } from "@hypr/plugin-auth";
import { fetch } from "@hypr/utils";

const BASE = "https://api.twenty.com/rest";

type Person = {
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

const setApiKey = async (key: string) => {
  await authCommands.setInVault("twenty-api-key", key);
};

const getApiKey = async () => {
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
const findManyPeople = async (query?: string) => {
  if (!query || query.trim() === "") {
    return [];
  }

  const key = await getApiKey();

  const filterParts = [
    `name.firstName[ilike]:${query}`,
    `name.lastName[ilike]:${query}`,
    `emails.primaryEmail[ilike]:${query}`,
  ];
  const filter = `or(${filterParts.join(",")})`;

  const url = new URL(`${BASE}/people`);
  url.search = new URLSearchParams({
    limit: "10",
    depth: "0",
    filter,
  }).toString();

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${key}`,
    },
  });
  const { data: { people } } = await response.json();
  return people as Person[];
};

// https://twenty.com/developers/rest-api/core#/operations/createOneNote
const createOneNote = async (title: string, body: string) => {
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

  const { data: { createNote } } = await res.json();
  return createNote as Note;
};

// https://twenty.com/developers/rest-api/core#/operations/createManyNoteTargets
const createManyNoteTargets = async (noteId: string, personIds: string[]) => {
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

export const ops = {
  setApiKey,
  getApiKey,
  findManyPeople,
  createOneNote,
  createManyNoteTargets,
};

export type { Note, Person };

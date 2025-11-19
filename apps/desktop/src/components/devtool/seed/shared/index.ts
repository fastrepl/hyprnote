import type { Store as PersistedStore } from "../../../../store/tinybase/main";

export * from "./builders";
export { createCalendar } from "./calendar";
export { createChatGroup, createChatMessage } from "./chat";
export { createEnhancedNote } from "./enhanced-note";
export { createEvent } from "./event";
export { createFolder } from "./folder";
export { createHuman } from "./human";
export * from "./loader";
export {
  createmappingSessionParticipant,
  createMappingTagSession,
} from "./mapping";
export { createMemory } from "./memory";
export { createOrganization } from "./organization";
export { createSession, generateEnhancedMarkdown } from "./session";
export { createTag } from "./tag";
export { createTemplate } from "./template";
export { generateTranscript } from "./transcript";

export type SeedDefinition = {
  id: string;
  label: string;
  run: (store: PersistedStore) => void;
};

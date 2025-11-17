import { faker } from "@faker-js/faker";

import { EMPTY_TIPTAP_DOC_STRING, md2json } from "@hypr/tiptap/shared";

import type { EnhancedNoteStorage } from "../../../store/tinybase/main";
import { DEFAULT_USER_ID, id } from "../../../utils";

const markdownToJsonString = (markdown: string): string => {
  try {
    const json = md2json(markdown);
    return JSON.stringify(json);
  } catch (error) {
    console.error("Failed to convert markdown to JSON:", error);
    return EMPTY_TIPTAP_DOC_STRING;
  }
};

export const createEnhancedNote = (
  sessionId: string,
  position: number,
  templateId?: string,
): { id: string; data: EnhancedNoteStorage } => {
  const title = faker.lorem.sentence({ min: 2, max: 5 });
  const contentMarkdown = faker.lorem.paragraphs(
    faker.number.int({ min: 1, max: 3 }),
    "\n\n",
  );

  return {
    id: id(),
    data: {
      user_id: DEFAULT_USER_ID,
      session_id: sessionId,
      content: markdownToJsonString(contentMarkdown),
      position,
      template_id: templateId,
      title,
      created_at: faker.date.recent({ days: 30 }).toISOString(),
    },
  };
};

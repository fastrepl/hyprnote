import { faker } from "@faker-js/faker";

import { md2json } from "@hypr/tiptap/shared";

import type { EnhancedNoteStorage } from "../../../store/tinybase/main";
import { DEFAULT_USER_ID, id } from "../../../utils";

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
      content: JSON.stringify(md2json(contentMarkdown)),
      position,
      template_id: templateId,
      title,
      created_at: faker.date.recent({ days: 30 }).toISOString(),
    },
  };
};

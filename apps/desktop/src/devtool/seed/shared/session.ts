import { faker } from "@faker-js/faker";

import type { SessionStorage } from "../../../store/tinybase/persisted";
import { DEFAULT_USER_ID, id } from "../../../utils";

export const generateTitle = () => {
  const lengthConfig = faker.helpers.weightedArrayElement([
    { weight: 40, value: { min: 2, max: 4 } },
    { weight: 35, value: { min: 4, max: 6 } },
    { weight: 15, value: { min: 6, max: 9 } },
    { weight: 8, value: { min: 9, max: 12 } },
    { weight: 2, value: { min: 12, max: 15 } },
  ]);

  const wordCount = faker.number.int(lengthConfig);
  return faker.lorem.sentence(wordCount);
};

export const generateEnhancedMarkdown = () => {
  const sections: string[] = [];
  const sectionCount = faker.number.int({ min: 3, max: 8 });

  for (let i = 0; i < sectionCount; i++) {
    const heading = faker.lorem.sentence({ min: 2, max: 5 });
    sections.push(`## ${heading}\n`);

    const bulletCount = faker.number.int({ min: 2, max: 5 });
    const bullets = faker.helpers.multiple(
      () => `- ${faker.lorem.sentence()}`,
      { count: bulletCount },
    );
    sections.push(bullets.join("\n"));
    sections.push("\n\n");
  }

  const mainHeading = faker.lorem.words({ min: 2, max: 4 });
  return `# ${mainHeading}\n\n${sections.join("")}`;
};

export const createSession = (eventId?: string, folderId?: string): { id: string; data: SessionStorage } => {
  const title = generateTitle();
  const raw_md = faker.lorem.paragraphs(faker.number.int({ min: 2, max: 5 }), "\n\n");
  const enhanced_md = generateEnhancedMarkdown();

  return {
    id: id(),
    data: {
      user_id: DEFAULT_USER_ID,
      title,
      raw_md,
      enhanced_md,
      created_at: faker.date.recent({ days: 30 }).toISOString(),
      event_id: eventId,
      folder_id: folderId,
    },
  };
};

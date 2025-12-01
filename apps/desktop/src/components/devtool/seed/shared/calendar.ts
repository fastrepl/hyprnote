import { faker } from "@faker-js/faker";

import type { Calendar } from "@hypr/store";

import { DEFAULT_USER_ID, id } from "../../../../utils";

export const createCalendar = () => {
  const template = faker.helpers.arrayElement([
    "Work Calendar",
    "Personal Calendar",
    "Team Calendar",
    "Project Calendar",
    "Meetings",
    "Events & Conferences",
    "Family Calendar",
    `${faker.company.name()} Calendar`,
    `${faker.commerce.department()} Team`,
    "Shared Calendar",
  ]);

  return {
    id: id(),
    data: {
      user_id: DEFAULT_USER_ID,
      name: template,
      created_at: faker.date.past({ years: 1 }).toISOString(),
    } satisfies Calendar,
  };
};

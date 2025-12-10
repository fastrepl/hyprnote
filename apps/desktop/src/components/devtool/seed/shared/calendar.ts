import { faker } from "@faker-js/faker";

import type { CalendarStorage } from "@hypr/store";

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

  const calendarId = id();
  return {
    id: calendarId,
    data: {
      user_id: DEFAULT_USER_ID,
      provider: faker.helpers.arrayElement(["apple", "google", "outlook"]) as
        | "apple"
        | "google"
        | "outlook",
      provider_calendar_id: calendarId,
      name: template,
      created_at: faker.date.past({ years: 1 }).toISOString(),
    } satisfies CalendarStorage,
  };
};

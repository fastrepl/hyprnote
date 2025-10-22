import { faker } from "@faker-js/faker";

import type { Event } from "../../../store/tinybase/persisted";
import { DEFAULT_USER_ID, id } from "../../../utils";

export const createEvent = (calendar_id: string) => {
  const timePattern = faker.helpers.weightedArrayElement([
    { weight: 5, value: "last-year" },
    { weight: 15, value: "past-two-weeks" },
    { weight: 10, value: "today" },
    { weight: 15, value: "next-few-days" },
    { weight: 15, value: "next-two-weeks" },
  ]);

  let startsAt: Date;
  const now = faker.defaultRefDate();

  switch (timePattern) {
    case "last-year":
      const daysLastYear = faker.number.int({ min: 180, max: 365 });
      startsAt = new Date(now.getTime() - daysLastYear * 24 * 60 * 60 * 1000);
      break;

    case "past-two-weeks":
      const daysPast = faker.number.int({ min: 1, max: 14 });
      startsAt = new Date(now.getTime() - daysPast * 24 * 60 * 60 * 1000);
      break;

    case "today":
      const hoursToday = faker.number.float({ min: -12, max: 12, fractionDigits: 1 });
      startsAt = new Date(now.getTime() + hoursToday * 60 * 60 * 1000);
      break;

    case "next-few-days":
      const daysNext = faker.number.int({ min: 1, max: 7 });
      startsAt = new Date(now.getTime() + daysNext * 24 * 60 * 60 * 1000);
      break;

    case "next-two-weeks":
      const daysLater = faker.number.int({ min: 8, max: 14 });
      startsAt = new Date(now.getTime() + daysLater * 24 * 60 * 60 * 1000);
      break;

    default:
      startsAt = faker.date.soon({ days: 7 });
  }

  const durationHours = faker.number.float({ min: 0.25, max: 4, fractionDigits: 2 });
  const endsAt = new Date(startsAt.getTime() + durationHours * 60 * 60 * 1000);

  const meetingType = faker.helpers.weightedArrayElement([
    { weight: 50, value: "online" },
    { weight: 30, value: "offline" },
    { weight: 20, value: "hybrid" },
  ]);

  const videoProviders = [
    { domain: "zoom.us", name: "Zoom" },
    { domain: "meet.google.com", name: "Google Meet" },
    { domain: "teams.microsoft.com", name: "Microsoft Teams" },
    { domain: "whereby.com", name: "Whereby" },
    { domain: "around.co", name: "Around" },
  ];

  const locations = [
    "Conference Room A",
    "Conference Room B",
    "Main Office - 3rd Floor",
    "Starbucks Downtown",
    "WeWork Coworking Space",
    "Client Office",
    "HQ Building 2",
    "Meeting Room Delta",
    "Cafeteria",
    "Rooftop Lounge",
  ];

  let meeting_link: string | undefined;
  let location: string | undefined;
  let description: string | undefined;

  if (meetingType === "online" || meetingType === "hybrid") {
    const provider = faker.helpers.arrayElement(videoProviders);
    const meetingId = faker.string.alphanumeric(10);
    meeting_link = `https://${provider.domain}/${meetingId}`;
  }

  if (meetingType === "offline" || meetingType === "hybrid") {
    location = faker.helpers.arrayElement(locations);
  }

  if (faker.datatype.boolean({ probability: 0.7 })) {
    description = faker.lorem.sentences(faker.number.int({ min: 1, max: 3 }));
  }

  return {
    id: id(),
    data: {
      user_id: DEFAULT_USER_ID,
      calendar_id,
      title: generateTitle(),
      started_at: startsAt.toISOString(),
      ended_at: endsAt.toISOString(),
      created_at: faker.date.recent({ days: 30 }).toISOString(),
      location,
      meeting_link,
      description,
    } satisfies Event,
  };
};

const generateTitle = () => {
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

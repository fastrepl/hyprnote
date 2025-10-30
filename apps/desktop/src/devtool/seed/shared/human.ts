import { faker } from "@faker-js/faker";

import type { Human } from "../../../store/tinybase/main";
import { DEFAULT_USER_ID, id } from "../../../utils";

export const createHuman = (org_id: string, isUser = false) => {
  const sex = faker.person.sexType();
  const firstName = faker.person.firstName(sex);
  const lastName = faker.person.lastName();

  const jobTitles = [
    "Software Engineer",
    "Product Manager",
    "Designer",
    "Engineering Manager",
    "CEO",
    "CTO",
    "VP of Engineering",
    "Data Scientist",
    "Marketing Manager",
    "Sales Director",
    "Account Executive",
    "Customer Success Manager",
    "Operations Manager",
    "HR Manager",
  ];

  return {
    id: id(),
    data: {
      user_id: DEFAULT_USER_ID,
      name: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }),
      job_title: faker.helpers.arrayElement(jobTitles),
      linkedin_username: faker.datatype.boolean({ probability: 0.7 })
        ? `${firstName.toLowerCase()}${lastName.toLowerCase()}`
        : undefined,
      is_user: isUser,
      created_at: faker.date.past({ years: 1 }).toISOString(),
      org_id,
    } satisfies Human,
  };
};

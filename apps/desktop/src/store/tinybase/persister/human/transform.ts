type FieldConfig = {
  storeKey: string;
  frontmatterKey: string;
  toStore: (frontmatter: Record<string, unknown>) => unknown;
  toFrontmatter: (storeValue: unknown) => unknown;
};

const stringField = (key: string): FieldConfig => ({
  storeKey: key,
  frontmatterKey: key,
  toStore: (fm) => String(fm[key] ?? ""),
  toFrontmatter: (v) => v ?? "",
});

const emailField: FieldConfig = {
  storeKey: "email",
  frontmatterKey: "emails",
  toStore: (fm) => {
    const emails = fm.emails;
    if (Array.isArray(emails)) {
      return emails
        .map((e) => String(e).trim())
        .filter(Boolean)
        .join(",");
    }
    return typeof fm.email === "string" ? fm.email : "";
  },
  toFrontmatter: (v) => {
    const email = v as string;
    if (!email) return [];
    return email
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
  },
};

export const HUMAN_FIELDS: FieldConfig[] = [
  stringField("user_id"),
  stringField("created_at"),
  stringField("name"),
  emailField,
  stringField("org_id"),
  stringField("job_title"),
  stringField("linkedin_username"),
];

export function frontmatterToStore(
  frontmatter: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of HUMAN_FIELDS) {
    result[field.storeKey] = field.toStore(frontmatter);
  }
  return result;
}

export function storeToFrontmatter(
  store: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of HUMAN_FIELDS) {
    result[field.frontmatterKey] = field.toFrontmatter(store[field.storeKey]);
  }
  return result;
}

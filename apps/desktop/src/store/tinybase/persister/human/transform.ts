import type { JsonValue } from "@hypr/plugin-fs-sync";
import type { HumanStorage } from "@hypr/store";

function emailsToStore(frontmatter: Record<string, unknown>): string {
  const emails = frontmatter.emails;
  if (Array.isArray(emails)) {
    return emails
      .map((e) => String(e).trim())
      .filter(Boolean)
      .join(",");
  }
  return typeof frontmatter.email === "string" ? frontmatter.email : "";
}

function emailToFrontmatter(email: unknown): string[] {
  const str = email as string;
  if (!str) return [];
  return str
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

export function frontmatterToStore(
  frontmatter: Record<string, unknown>,
): Record<string, unknown> {
  return {
    user_id: String(frontmatter.user_id ?? ""),
    created_at: String(frontmatter.created_at ?? ""),
    name: String(frontmatter.name ?? ""),
    email: emailsToStore(frontmatter),
    org_id: String(frontmatter.org_id ?? ""),
    job_title: String(frontmatter.job_title ?? ""),
    linkedin_username: String(frontmatter.linkedin_username ?? ""),
  };
}

export function storeToFrontmatter(
  store: Record<string, unknown>,
): Record<string, unknown> {
  return {
    user_id: store.user_id ?? "",
    created_at: store.created_at ?? "",
    name: store.name ?? "",
    emails: emailToFrontmatter(store.email),
    org_id: store.org_id ?? "",
    job_title: store.job_title ?? "",
    linkedin_username: store.linkedin_username ?? "",
  };
}

export function frontmatterToHuman(
  frontmatter: Record<string, unknown>,
  body: string,
): HumanStorage {
  return {
    ...frontmatterToStore(frontmatter),
    memo: body,
  } as HumanStorage;
}

export function humanToFrontmatter(human: HumanStorage): {
  frontmatter: Record<string, JsonValue>;
  body: string;
} {
  const { memo, ...storeFields } = human;
  return {
    frontmatter: storeToFrontmatter(storeFields) as Record<string, JsonValue>,
    body: memo ?? "",
  };
}

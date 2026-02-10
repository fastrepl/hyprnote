import type { JsonValue } from "@hypr/plugin-fs-sync";
import type { OrganizationStorage } from "@hypr/store";

export function frontmatterToOrganization(
  frontmatter: Record<string, unknown>,
  _body: string,
): OrganizationStorage {
  return {
    user_id: String(frontmatter.user_id ?? ""),
    name: String(frontmatter.name ?? ""),
    pinned: Boolean(frontmatter.pinned ?? false),
    pin_order: frontmatter.pin_order != null ? Number(frontmatter.pin_order) : undefined,
  };

}

export function organizationToFrontmatter(org: OrganizationStorage): {
  frontmatter: Record<string, JsonValue>;
  body: string;
} {
  return {
    frontmatter: {
      name: org.name ?? "",
      user_id: org.user_id ?? "",
      pinned: org.pinned ?? false,
    },
    body: "",
  };
}

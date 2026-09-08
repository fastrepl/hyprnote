import { BADGES, type BadgeId, parseCollectedBadges } from "./badges";

import { executeTransaction, useLiveQuery } from "~/db";

export const COLLECTED_BADGES_SQL = `
  SELECT value_json FROM app_settings
  WHERE substr(id, 1, length(?)) = ?
`;

function collectionPrefix(ownerId: string) {
  return `personal-badges.v1:${ownerId}:`;
}

export function useCollectedBadges(ownerId: string) {
  const prefix = collectionPrefix(ownerId);
  return useLiveQuery({
    sql: COLLECTED_BADGES_SQL,
    params: [prefix, prefix],
    mapRows: parseCollectedBadges,
  });
}

export async function collectBadges(ownerId: string, ids: BadgeId[]) {
  const collectedAt = new Date().toISOString();
  const unique = [...new Set(ids)].filter((id) =>
    BADGES.some((badge) => badge.id === id),
  );
  if (!unique.length) return;
  await executeTransaction(
    unique.map((id) => ({
      sql: `
      INSERT INTO app_settings (id, value_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `,
      params: [
        `${collectionPrefix(ownerId)}${id}`,
        JSON.stringify({ id, collectedAt }),
        collectedAt,
      ],
    })),
  );
}

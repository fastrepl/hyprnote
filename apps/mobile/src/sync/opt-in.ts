import { execute, useLiveQuery } from "@/db";
import {
  CLOUD_SYNC_OPT_IN_SQL,
  type CloudSyncOptInRow,
  resolveCloudSyncOptIn,
} from "@/sync/opt-in-model";

export function useCloudSyncOptIn(accountUserId: string | null): boolean {
  const { data } = useLiveQuery<CloudSyncOptInRow, boolean>({
    sql: CLOUD_SYNC_OPT_IN_SQL,
    params: [accountUserId ?? ""],
    mapRows: resolveCloudSyncOptIn,
    enabled: accountUserId !== null,
  });
  return data ?? false;
}

export async function setCloudSyncOptIn(enabled: boolean): Promise<void> {
  await execute(
    `INSERT INTO app_settings (id, value_json, updated_at) VALUES ('cloud_sync_enabled', ?, ?)
     ON CONFLICT(id) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
    [JSON.stringify(enabled), new Date().toISOString()],
  );
}

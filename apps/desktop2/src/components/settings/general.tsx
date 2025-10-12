import { useValidatedRow } from "../../hooks/useValidatedRow";
import * as persisted from "../../store/tinybase/persisted";

export function SettingsGeneral() {
  const res = persisted.useConfig();
  if (!res) {
    return null;
  }
  const { id, config } = res;

  const parsedConfig = persisted.configSchema.parse(config);

  const handleUpdate = persisted.UI.useSetRowCallback(
    "configs",
    id,
    (row: persisted.Config) => ({
      ...row,
      spoken_languages: JSON.stringify(row.spoken_languages),
      jargons: JSON.stringify(row.jargons),
      notification_ignored_platforms: row.notification_ignored_platforms
        ? JSON.stringify(row.notification_ignored_platforms)
        : undefined,
    }),
    [id],
    persisted.STORE_ID,
  );

  const r = useValidatedRow(persisted.configSchema, parsedConfig, handleUpdate);

  return (
    <div>
      <pre>{JSON.stringify(config, null, 2)}</pre>
      <input
        type="checkbox"
        onChange={(e) => r.setField("save_recordings", e.target.checked)}
      />
    </div>
  );
}

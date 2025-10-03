import { createFileRoute } from "@tanstack/react-router";

import { useValidatedRow } from "../hooks/useValidatedRow";
import * as persisted from "../tinybase/store/persisted";

export const Route = createFileRoute("/app/settings")({
  component: Component,
});

function Component() {
  const rowIds = persisted.UI.useResultRowIds(
    persisted.QUERIES.configForUser,
    persisted.STORE_ID,
  );
  const rowId = rowIds?.[0] ?? "";

  const config = persisted.UI.useResultRow(
    persisted.QUERIES.configForUser,
    rowId,
    persisted.STORE_ID,
  ) as unknown as persisted.Config | undefined;

  const handleUpdate = persisted.UI.useSetRowCallback(
    "configs",
    rowId,
    (row: persisted.Config, _store) => ({
      ...row,
      spoken_languages: JSON.stringify(row.spoken_languages),
      jargons: JSON.stringify(row.jargons),
      notification_ignored_platforms: row.notification_ignored_platforms
        ? JSON.stringify(row.notification_ignored_platforms)
        : undefined,
    }),
    [rowId],
    persisted.STORE_ID,
  );

  const _ = useValidatedRow(persisted.configSchema, config, handleUpdate);

  return <pre>{JSON.stringify(config, null, 2)}</pre>;
}

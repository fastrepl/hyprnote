import { createFileRoute } from "@tanstack/react-router";

import clsx from "clsx";
import { z } from "zod";
import { useValidatedRow } from "../../hooks/useValidatedRow";
import * as persisted from "../../tinybase/store/persisted";

const TABS = ["general", "calendar", "account"] as const;

const validateSearch = z.object({
  tab: z.enum(TABS).default("general"),
});

export const Route = createFileRoute("/app/settings")({
  validateSearch,
  component: Component,
});

function Component() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <div>
      <div className="flex flex-col gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={clsx(["w-32 px-2 py-1 rounded", search.tab === tab && "bg-gray-200"])}
            onClick={() => navigate({ search: { tab } })}
          >
            {tab}
          </button>
        ))}
      </div>
      {search.tab === "general" && <SettingsGeneral />}
    </div>
  );
}

function SettingsGeneral() {
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

  const r = useValidatedRow(persisted.configSchema, config, handleUpdate);

  return (
    <div>
      <pre>{JSON.stringify(config, null, 2)}</pre>
      <pre>{JSON.stringify(r, null, 2)}</pre>
    </div>
  );
}

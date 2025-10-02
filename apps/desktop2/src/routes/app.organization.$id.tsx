import { createFileRoute } from "@tanstack/react-router";
import * as persisted from "../tinybase/store/persisted";

import { useValidatedRow } from "../hooks/useValidatedRow";

export const Route = createFileRoute("/app/organization/$id")({
  component: Component,
});

function Component() {
  const { id } = Route.useParams();
  const organization = persisted.UI.useRow("organizations", id, persisted.STORE_ID);

  const handleUpdate = persisted.UI.useSetRowCallback(
    "humans",
    id,
    (row: persisted.Organization, _store) => row,
    [],
    persisted.STORE_ID,
  );

  const { setField, errors } = useValidatedRow(persisted.organizationSchema, organization, handleUpdate);

  return (
    <div className="space-y-4 p-4">
      <pre className="text-xs">{JSON.stringify(organization, null, 2)}</pre>

      <div>
        <input
          value={organization.name}
          onChange={(e) => setField("name", e.target.value)}
          className={errors.name ? "border-red-500" : ""}
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useValidatedRow } from "../hooks/useValidatedRow";
import * as hybrid from "../tinybase/store/hybrid";

export const Route = createFileRoute("/app/human/$id")({
  component: Component,
});

function Component() {
  const { id } = Route.useParams();
  const human = hybrid.UI.useRow("humans", id, hybrid.STORE_ID);

  const handleUpdate = hybrid.UI.useSetRowCallback(
    "humans",
    id,
    (row: hybrid.Human, _store) => row,
    [],
    hybrid.STORE_ID,
  );

  const { setField, errors } = useValidatedRow(hybrid.humanSchema, human, handleUpdate);

  return (
    <div className="space-y-4 p-4">
      <pre className="text-xs">{JSON.stringify(human, null, 2)}</pre>

      <div>
        <input
          value={human.name}
          onChange={(e) => setField("name", e.target.value)}
          className={errors.name ? "border-red-500" : ""}
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
      </div>

      <div>
        <input
          value={human.email}
          onChange={(e) => setField("email", e.target.value)}
          className={errors.email ? "border-red-500" : ""}
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
      </div>
    </div>
  );
}

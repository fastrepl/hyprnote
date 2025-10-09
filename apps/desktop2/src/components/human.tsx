import { useValidatedRow } from "../hooks/useValidatedRow";
import * as persisted from "../store/tinybase/persisted";

export function Human({ id }: { id: string }) {
  const human = persisted.UI.useRow("humans", id, persisted.STORE_ID);

  const handleUpdate = persisted.UI.useSetRowCallback(
    "humans",
    id,
    (row: persisted.Human, _store) => row,
    [],
    persisted.STORE_ID,
  );

  const { setField, errors } = useValidatedRow(persisted.humanSchema, human, handleUpdate);

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

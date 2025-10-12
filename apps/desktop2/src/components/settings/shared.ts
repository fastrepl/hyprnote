import * as internal from "../../store/tinybase/internal";
import * as persisted from "../../store/tinybase/persisted";

import { useSafeObjectUpdate } from "../../hooks/useSafeObjectUpdate";

export const useUpdateConfig = () => {
  const _value = internal.UI.useValues(internal.STORE_ID);
  const value: internal.Config = internal.configSchema.parse(_value);

  const cb = internal.UI.useSetPartialValuesCallback(
    (row: Partial<internal.Config>) => ({ ...row } satisfies Partial<internal.ConfigStorage>),
    [],
    internal.STORE_ID,
  );

  const handle = useSafeObjectUpdate(internal.configSchema, value, cb);
  return { value, handle };
};

export const useUpdateTemplate = (id: string) => {
  const _value = persisted.UI.useRow("templates", id, persisted.STORE_ID);
  const value: persisted.Template = persisted.templateSchema.parse(_value);

  const cb = persisted.UI.useSetPartialRowCallback(
    "templates",
    id,
    (row: Partial<persisted.Template>) => ({
      ...row,
      sections: JSON.stringify(row.sections),
    } satisfies Partial<persisted.TemplateStorage>),
    [id],
    persisted.STORE_ID,
  );

  const handle = useSafeObjectUpdate(persisted.templateSchema, value, cb);
  return { value, handle };
};

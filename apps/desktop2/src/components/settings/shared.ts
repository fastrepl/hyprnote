import * as internal from "../../store/tinybase/internal";
import * as persisted from "../../store/tinybase/persisted";

import { useSafeObjectUpdate } from "../../hooks/useSafeObjectUpdate";

export const useUpdateGeneral = () => {
  const _value = internal.UI.useValues(internal.STORE_ID);
  const value: internal.General = internal.generalSchema.parse(_value);

  const cb = internal.UI.useSetPartialValuesCallback(
    (
      row: Partial<internal.General>,
    ) => ({
      ...row,
      spoken_languages: JSON.stringify(row.spoken_languages),
      jargons: JSON.stringify(row.jargons),
    } satisfies Partial<internal.GeneralStorage>),
    [],
    internal.STORE_ID,
  );

  const handle = useSafeObjectUpdate(internal.generalSchema, value, cb);
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

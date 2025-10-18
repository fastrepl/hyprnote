import * as internal from "../../store/tinybase/internal";
import * as persisted from "../../store/tinybase/persisted";

import { useSafeObjectUpdate } from "../../hooks/useSafeObjectUpdate";

export const useUpdateGeneral = () => {
  const _value = internal.UI.useValues(internal.STORE_ID);
  const value = internal.generalSchema.parse(_value);

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

export const useUpdateAIProvider = (type: "llm" | "stt", id: string) => {
  const _value = internal.UI.useRow("ai_providers", id, internal.STORE_ID);
  const initialData = _value ? internal.aiProviderSchema.safeParse(_value).data : { type };

  const cb = internal.UI.useSetPartialRowCallback(
    "ai_providers",
    id,
    (row: Partial<internal.AIProvider>) => ({ ...row } satisfies Partial<internal.AIProviderStorage>),
    [id],
    internal.STORE_ID,
  );

  return useSafeObjectUpdate(internal.aiProviderSchema, initialData, cb);
};

export const useUpdateTemplate = (id: string) => {
  const _value = persisted.UI.useRow("templates", id, persisted.STORE_ID);
  const value = persisted.templateSchema.parse(_value);

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

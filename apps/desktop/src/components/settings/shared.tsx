import { Switch } from "@hypr/ui/components/ui/switch";

import { useSafeObjectUpdate } from "../../hooks/useSafeObjectUpdate";
import * as internal from "../../store/tinybase/internal";
import * as persisted from "../../store/tinybase/persisted";

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

export function SettingRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <h3 className="text-sm font-medium mb-1">{title}</h3>
        <p className="text-xs text-neutral-600">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

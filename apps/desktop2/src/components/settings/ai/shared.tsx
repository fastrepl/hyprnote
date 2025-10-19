import * as internal from "../../../store/tinybase/internal";

export function useProvider(id: string) {
  const providerRow = internal.UI.useRow("ai_providers", id, internal.STORE_ID);
  const setProvider = internal.UI.useSetPartialRowCallback(
    "ai_providers",
    id,
    (row: Partial<internal.AIProvider>) => row,
    [id],
    internal.STORE_ID,
  ) as (row: Partial<internal.AIProvider>) => void;

  const { data } = internal.aiProviderSchema.safeParse(providerRow);
  return [data, setProvider] as const;
}

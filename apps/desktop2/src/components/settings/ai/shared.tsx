import * as internal from "../../../store/tinybase/internal";

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function ModelCard({
  name,
  description,
  status,
}: {
  name: string;
  description: string;
  status: string;
}) {
  return (
    <div className="p-4 border rounded-lg">
      <h4 className="font-medium">{name}</h4>
      <p className="text-sm text-gray-500">{description}</p>
      <p className="text-xs text-gray-400 mt-2">{status}</p>
    </div>
  );
}

export function ProviderCard({
  name,
  configured,
}: {
  name: string;
  configured?: boolean;
}) {
  return (
    <div className="p-4 border rounded-lg">
      <h4 className="font-medium">{name}</h4>
      {configured && <p className="text-xs text-green-600 mt-1">Configured</p>}
    </div>
  );
}

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

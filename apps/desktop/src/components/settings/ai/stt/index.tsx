import { ConfigureProviders } from "./configure";
import { HealthCheckForAvailability } from "./health";
import { SelectProviderAndModel } from "./select";

export function STT({ headerAction }: { headerAction?: React.ReactNode } = {}) {
  return (
    <div className="space-y-6">
      <HealthCheckForAvailability />
      <SelectProviderAndModel headerAction={headerAction} />
      <ConfigureProviders />
    </div>
  );
}

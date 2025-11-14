import { ConfigureProviders } from "./configure";
import { HealthCheckForAvailability } from "./health";
import { SelectProviderAndModel } from "./select";

export function STT() {
  return (
    <div className="space-y-6">
      <HealthCheckForAvailability />
      <SelectProviderAndModel />
      <ConfigureProviders />
    </div>
  );
}

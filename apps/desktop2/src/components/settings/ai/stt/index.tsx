import { ConfigureProviders } from "./configure";
import { SelectProviderAndModel } from "./select";

export function STT() {
  return (
    <div className="space-y-6">
      <SelectProviderAndModel />
      <ConfigureProviders />
    </div>
  );
}

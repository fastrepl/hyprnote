import { ConfigureProviders } from "./configure";
import { SelectProviderAndModel } from "./select";

export function STT() {
  return (
    <div className="space-y-6 mt-4">
      <SelectProviderAndModel />
      <ConfigureProviders />
    </div>
  );
}

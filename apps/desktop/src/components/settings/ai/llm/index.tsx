import { ConfigureProviders } from "./configure";
import { SelectProviderAndModel } from "./select";

export function LLM() {
  return (
    <div className="space-y-6 mt-4">
      <SelectProviderAndModel />
      <ConfigureProviders />
    </div>
  );
}

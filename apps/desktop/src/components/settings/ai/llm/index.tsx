import { ConfigureProviders } from "./configure";
import { NoModelBanner } from "./no-model-banner";
import { SelectProviderAndModel } from "./select";

export function LLM() {
  return (
    <div className="space-y-6">
      <NoModelBanner />
      <SelectProviderAndModel />
      <ConfigureProviders />
    </div>
  );
}

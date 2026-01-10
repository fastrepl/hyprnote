import { ConfigureProviders } from "./configure";
import { LlmSettingsProvider } from "./context";
import { SelectProviderAndModel } from "./select";

export function LLM() {
  return (
    <LlmSettingsProvider>
      <div className="space-y-6 mt-4">
        <SelectProviderAndModel />
        <ConfigureProviders />
      </div>
    </LlmSettingsProvider>
  );
}

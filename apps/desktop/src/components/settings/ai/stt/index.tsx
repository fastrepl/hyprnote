import { ConfigureProviders } from "./configure";
import { SttSettingsProvider } from "./context";
import { SelectProviderAndModel } from "./select";

export function STT() {
  return (
    <SttSettingsProvider>
      <div className="space-y-6 mt-4">
        <SelectProviderAndModel />
        <ConfigureProviders />
      </div>
    </SttSettingsProvider>
  );
}

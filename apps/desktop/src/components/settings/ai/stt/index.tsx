import { BannerForSTT } from "./banner";
import { ConfigureProviders } from "./configure";
import { SelectProviderAndModel } from "./select";

export function STT() {
  return (
    <div className="space-y-6">
      <BannerForSTT />
      <SelectProviderAndModel />
      <ConfigureProviders />
    </div>
  );
}

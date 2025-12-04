import { type AppIcon } from "@hypr/plugin-windows";
import { cn } from "@hypr/utils";

import darkIcon from "../../../assets/icons/dark.png";
import lightIcon from "../../../assets/icons/light.png";
import nightlyIcon from "../../../assets/icons/nightly.png";
import proIcon from "../../../assets/icons/pro.png";

const ICON_OPTIONS: { value: AppIcon; label: string; icon: string }[] = [
  { value: "dark", label: "Dark", icon: darkIcon },
  { value: "light", label: "Light", icon: lightIcon },
  { value: "nightly", label: "Nightly", icon: nightlyIcon },
  { value: "pro", label: "Pro", icon: proIcon },
];

interface AppIconSettingsProps {
  value: AppIcon;
  onChange: (value: AppIcon) => void;
}

export function AppIconSettings({ value, onChange }: AppIconSettingsProps) {
  return (
    <div>
      <h2 className="font-semibold mb-4">App Icon</h2>
      <p className="text-xs text-neutral-600 mb-4">
        Choose your preferred app icon style. Changes apply immediately.
      </p>
      <div className="grid grid-cols-4 gap-3">
        {ICON_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
              value === option.value
                ? "border-blue-500 bg-blue-50"
                : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50",
            )}
          >
            <img
              src={option.icon}
              alt={option.label}
              className="w-12 h-12 rounded-lg"
            />
            <span className="text-xs font-medium">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

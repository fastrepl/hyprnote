import { useEffect, useMemo, useState } from "react";

import {
  type AppIcon,
  commands as windowsCommands,
} from "@hypr/plugin-windows";
import { cn } from "@hypr/utils";

import darkIcon from "../../../assets/icons/dark.png";
import lightIcon from "../../../assets/icons/light.png";
import nightlyIcon from "../../../assets/icons/nightly.png";
import proIcon from "../../../assets/icons/pro.png";
import { useBillingAccess } from "../../../billing";

const ICON_OPTIONS: { value: AppIcon; label: string; icon: string }[] = [
  { value: "dark", label: "Dark", icon: darkIcon },
  { value: "light", label: "Light", icon: lightIcon },
  { value: "nightly", label: "Nightly", icon: nightlyIcon },
  { value: "pro", label: "Pro", icon: proIcon },
];

type BuildChannel = "nightly" | "stable" | "staging" | "dev";

function getAvailableIconsForTier(
  channel: BuildChannel,
  isPro: boolean,
): AppIcon[] {
  if (channel === "nightly") {
    return ["nightly"];
  }

  if (isPro) {
    return ["dark", "light", "nightly", "pro"];
  }

  return ["dark", "light"];
}

interface AppIconSettingsProps {
  value: AppIcon;
  onChange: (value: AppIcon) => void;
}

export function AppIconSettings({ value, onChange }: AppIconSettingsProps) {
  const [channel, setChannel] = useState<BuildChannel>("dev");
  const { isPro } = useBillingAccess();

  useEffect(() => {
    windowsCommands.getBuildChannel().then((ch) => {
      setChannel(ch as BuildChannel);
    });
  }, []);

  const availableIcons = useMemo(
    () => getAvailableIconsForTier(channel, isPro),
    [channel, isPro],
  );

  const visibleOptions = useMemo(
    () => ICON_OPTIONS.filter((opt) => availableIcons.includes(opt.value)),
    [availableIcons],
  );

  useEffect(() => {
    if (!availableIcons.includes(value)) {
      const defaultIcon = availableIcons[0];
      if (defaultIcon) {
        onChange(defaultIcon);
      }
    }
  }, [availableIcons, value, onChange]);

  if (visibleOptions.length <= 1) {
    return null;
  }

  return (
    <div>
      <h2 className="font-semibold mb-4">App Icon</h2>
      <p className="text-xs text-neutral-600 mb-4">
        Choose your preferred app icon style. Changes apply immediately.
      </p>
      <div className="grid grid-cols-4 gap-3">
        {visibleOptions.map((option) => (
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

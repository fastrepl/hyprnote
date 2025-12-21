import { useQuery } from "@tanstack/react-query";
import { LockIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import {
  commands,
  type IconVariant,
} from "../../../../../../plugins/icon/js/bindings.gen";
import { useBillingAccess } from "../../../billing";

const ICON_DISPLAY_NAMES: Record<IconVariant, string> = {
  beta: "Beta",
  dark: "Dark",
  light: "Light",
  pro: "Pro",
};

const ALL_ICONS: IconVariant[] = ["beta", "light", "dark", "pro"];

type SeasonalIcon =
  | "xmas-beta"
  | "xmas-light"
  | "xmas-dark"
  | "xmas-pro"
  | "hanukkah"
  | "kwanzaa";

const SEASONAL_ICON_DISPLAY_NAMES: Record<SeasonalIcon, string> = {
  "xmas-beta": "Christmas 1",
  "xmas-light": "Christmas 2",
  "xmas-dark": "Christmas 3",
  "xmas-pro": "Christmas 4",
  hanukkah: "Hanukkah",
  kwanzaa: "Kwanzaa",
};

export function IconSettings() {
  const { isPro } = useBillingAccess();
  const [selectedIcon, setSelectedIcon] = useState<IconVariant | null>(null);
  const [selectedSeasonalIcon, setSelectedSeasonalIcon] =
    useState<SeasonalIcon | null>(null);
  const [isChristmas, setIsChristmas] = useState(false);

  const availableIconsQuery = useQuery({
    queryKey: ["availableIcons", isPro],
    queryFn: async () => {
      const result = await commands.getAvailableIcons(isPro);
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  useEffect(() => {
    commands.isChristmasSeason().then(setIsChristmas);
  }, []);

  const handleIconSelect = useCallback(
    async (icon: IconVariant, isEnabled: boolean) => {
      if (!isEnabled) return;

      const result = await commands.setDockIcon(icon);
      if (result.status === "ok") {
        setSelectedIcon(icon);
        setSelectedSeasonalIcon(null);
      }
    },
    [],
  );

  const handleSeasonalIconSelect = useCallback(
    async (icon: SeasonalIcon, isEnabled: boolean) => {
      if (!isEnabled) return;

      const result = await commands.setDockIcon(icon);
      if (result.status === "ok") {
        setSelectedSeasonalIcon(icon);
        setSelectedIcon(null);
      }
    },
    [],
  );

  if (availableIconsQuery.isLoading) {
    return (
      <div>
        <h2 className="font-semibold mb-4">App Icon</h2>
        <div className="text-sm text-neutral-500">Loading...</div>
      </div>
    );
  }

  if (availableIconsQuery.isError) {
    return (
      <div>
        <h2 className="font-semibold mb-4">App Icon</h2>
        <div className="text-sm text-red-500">
          Failed to load available icons
        </div>
      </div>
    );
  }

  const availableIcons = availableIconsQuery.data ?? [];

  const availableSeasonalIcons: SeasonalIcon[] = [
    ...(isChristmas
      ? ([
          "xmas-beta",
          "xmas-light",
          "xmas-dark",
          "xmas-pro",
          "hanukkah",
          "kwanzaa",
        ] as const)
      : []),
  ];

  return (
    <div>
      <h2 className="font-semibold mb-4">App Icon</h2>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-600">
          Choose your preferred app icon.
        </p>
        <div className="flex flex-wrap gap-3">
          {ALL_ICONS.map((icon) => {
            const isEnabled = availableIcons.includes(icon);
            return (
              <IconOption
                key={icon}
                icon={icon}
                isSelected={selectedIcon === icon}
                isEnabled={isEnabled}
                onClick={() => handleIconSelect(icon, isEnabled)}
              />
            );
          })}
          {availableSeasonalIcons.map((icon) => (
            <SeasonalIconOption
              key={icon}
              icon={icon}
              isSelected={selectedSeasonalIcon === icon}
              isEnabled={isPro}
              onClick={() => handleSeasonalIconSelect(icon, isPro)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function IconOption({
  icon,
  isSelected,
  isEnabled,
  onClick,
}: {
  icon: IconVariant;
  isSelected: boolean;
  isEnabled: boolean;
  onClick: () => void;
}) {
  const button = (
    <button
      onClick={onClick}
      disabled={!isEnabled}
      className={cn([
        "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all relative w-28",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-neutral-200",
        isEnabled
          ? "hover:border-neutral-300 hover:bg-neutral-50 cursor-pointer"
          : "cursor-not-allowed grayscale",
      ])}
    >
      <div className="size-20 rounded-xl overflow-hidden flex items-center justify-center">
        <img
          src={`https://raw.githubusercontent.com/fastrepl/hyprnote/main/apps/desktop/src-tauri/icons/${icon}/Square107x107Logo.png`}
          alt={`${ICON_DISPLAY_NAMES[icon]} icon`}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
      <span className="text-xs font-medium text-neutral-700 flex items-center gap-1">
        {ICON_DISPLAY_NAMES[icon]}
        {!isEnabled && <LockIcon className="size-3" />}
      </span>
    </button>
  );

  if (!isEnabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>Upgrade to Pro to unlock</TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

function SeasonalIconOption({
  icon,
  isSelected,
  isEnabled,
  onClick,
}: {
  icon: SeasonalIcon;
  isSelected: boolean;
  isEnabled: boolean;
  onClick: () => void;
}) {
  const button = (
    <button
      onClick={onClick}
      disabled={!isEnabled}
      className={cn([
        "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all relative w-28",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-neutral-200",
        isEnabled
          ? "hover:border-neutral-300 hover:bg-neutral-50 cursor-pointer"
          : "cursor-not-allowed grayscale",
      ])}
    >
      <div className="size-20 rounded-xl overflow-hidden flex items-center justify-center">
        <img
          src={`https://raw.githubusercontent.com/fastrepl/hyprnote/main/apps/desktop/src-tauri/icons/${icon}/Square107x107Logo.png`}
          alt={`${SEASONAL_ICON_DISPLAY_NAMES[icon]} icon`}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
      <span className="text-xs font-medium text-neutral-700 flex items-center gap-1">
        {SEASONAL_ICON_DISPLAY_NAMES[icon]}
        {!isEnabled && <LockIcon className="size-3" />}
      </span>
    </button>
  );

  if (!isEnabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>Upgrade to Pro to unlock</TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

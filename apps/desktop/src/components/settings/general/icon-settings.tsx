import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

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

const ALL_ICONS: IconVariant[] = ["beta", "dark", "light", "pro"];

type HolidayIcon = "hanukkah" | "kwanzaa";

const HOLIDAY_ICON_DISPLAY_NAMES: Record<HolidayIcon, string> = {
  hanukkah: "Hanukkah",
  kwanzaa: "Kwanzaa",
};

export function IconSettings() {
  const { isPro } = useBillingAccess();
  const [selectedIcon, setSelectedIcon] = useState<IconVariant | null>(null);
  const [selectedHolidayIcon, setSelectedHolidayIcon] =
    useState<HolidayIcon | null>(null);
  const [isChristmas, setIsChristmas] = useState(false);
  const [isHanukkah, setIsHanukkah] = useState(false);
  const [isKwanzaa, setIsKwanzaa] = useState(false);

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
    commands.isHanukkahSeason().then(setIsHanukkah);
    commands.isKwanzaaSeason().then(setIsKwanzaa);
  }, []);

  const handleIconSelect = useCallback(
    async (icon: IconVariant, isEnabled: boolean) => {
      if (!isEnabled) return;

      const iconName = isChristmas ? `xmas-${icon}` : icon;
      const result = await commands.setDockIcon(iconName);
      if (result.status === "ok") {
        setSelectedIcon(icon);
        setSelectedHolidayIcon(null);
      }
    },
    [isChristmas],
  );

  const handleHolidayIconSelect = useCallback(async (icon: HolidayIcon) => {
    const result = await commands.setDockIcon(icon);
    if (result.status === "ok") {
      setSelectedHolidayIcon(icon);
      setSelectedIcon(null);
    }
  }, []);

  const handleReset = useCallback(async () => {
    const result = await commands.resetDockIcon();
    if (result.status === "ok") {
      setSelectedIcon(null);
      setSelectedHolidayIcon(null);
    }
  }, []);

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
  const availableHolidayIcons: HolidayIcon[] = [
    ...(isHanukkah ? (["hanukkah"] as const) : []),
    ...(isKwanzaa ? (["kwanzaa"] as const) : []),
  ];

  return (
    <div>
      <h2 className="font-semibold mb-4">App Icon</h2>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-600">
          Choose your preferred app icon.
          {isChristmas && " Christmas edition icons are currently active!"}
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            {ALL_ICONS.map((icon) => {
              const isEnabled = availableIcons.includes(icon);
              return (
                <IconOption
                  key={icon}
                  icon={icon}
                  isChristmas={isChristmas}
                  isSelected={selectedIcon === icon}
                  isEnabled={isEnabled}
                  onClick={() => handleIconSelect(icon, isEnabled)}
                />
              );
            })}
          </div>
          {availableHolidayIcons.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {availableHolidayIcons.map((icon) => (
                <HolidayIconOption
                  key={icon}
                  icon={icon}
                  isSelected={selectedHolidayIcon === icon}
                  onClick={() => handleHolidayIconSelect(icon)}
                />
              ))}
            </div>
          )}
        </div>
        {(selectedIcon || selectedHolidayIcon) && (
          <button
            onClick={handleReset}
            className="text-sm text-neutral-500 hover:text-neutral-700 underline self-start"
          >
            Reset to default
          </button>
        )}
        {!isPro && (
          <p className="text-xs text-neutral-500">
            Upgrade to Pro to unlock Beta and Pro icon variants.
          </p>
        )}
      </div>
    </div>
  );
}

function IconOption({
  icon,
  isChristmas,
  isSelected,
  isEnabled,
  onClick,
}: {
  icon: IconVariant;
  isChristmas: boolean;
  isSelected: boolean;
  isEnabled: boolean;
  onClick: () => void;
}) {
  const iconName = isChristmas ? `xmas-${icon}` : icon;

  return (
    <button
      onClick={onClick}
      disabled={!isEnabled}
      className={cn([
        "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all relative",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-neutral-200",
        isEnabled
          ? "hover:border-neutral-300 hover:bg-neutral-50 cursor-pointer"
          : "opacity-50 cursor-not-allowed",
      ])}
    >
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-100 flex items-center justify-center">
        <img
          src={`/icons/${iconName}/icon-64.png`}
          alt={`${ICON_DISPLAY_NAMES[icon]} icon`}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
      <span className="text-xs font-medium text-neutral-700">
        {ICON_DISPLAY_NAMES[icon]}
      </span>
      {!isEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg">
          <svg
            className="w-6 h-6 text-neutral-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
      )}
    </button>
  );
}

function HolidayIconOption({
  icon,
  isSelected,
  onClick,
}: {
  icon: HolidayIcon;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn([
        "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50",
      ])}
    >
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-100 flex items-center justify-center">
        <img
          src={`/icons/${icon}/icon-64.png`}
          alt={`${HOLIDAY_ICON_DISPLAY_NAMES[icon]} icon`}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
      <span className="text-xs font-medium text-neutral-700">
        {HOLIDAY_ICON_DISPLAY_NAMES[icon]}
      </span>
    </button>
  );
}

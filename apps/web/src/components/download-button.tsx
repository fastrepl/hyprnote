import { Icon } from "@iconify-icon/react";

import { cn } from "@hypr/utils";

import { usePlatform } from "@/hooks/use-platform";

export function DownloadButton() {
  const platform = usePlatform();

  const getIcon = () => {
    switch (platform) {
      case "mac":
        return "mdi:apple";
      case "windows":
        return "mdi:microsoft-windows";
      case "linux":
        return "mdi:linux";
      default:
        return "mdi:apple";
    }
  };

  const getLabel = () => {
    switch (platform) {
      case "mac":
        return "Download for Mac";
      case "windows":
        return "Download for Windows";
      case "linux":
        return "Download for Linux";
      default:
        return "Download for Mac";
    }
  };

  return (
    <a
      href="/download/apple-silicon"
      download
      className={cn([
        "group px-6 h-12 flex items-center justify-center text-base sm:text-lg",
        "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full",
        "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
        "transition-all",
      ])}
    >
      <Icon icon={getIcon()} className="text-xl mr-2" />
      {getLabel()}
    </a>
  );
}

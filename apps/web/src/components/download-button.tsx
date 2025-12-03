import { Icon } from "@iconify-icon/react";

import { cn } from "@hypr/utils";

import { usePlatform } from "@/hooks/use-platform";

export function DownloadButton() {
  const platform = usePlatform();

  const getPlatformData = () => {
    switch (platform) {
      case "mac":
        return {
          icon: "mdi:apple",
          label: "Download for Mac",
          href: "/download/apple-silicon",
        };
      case "windows":
        return {
          icon: "mdi:microsoft-windows",
          label: "Download for Windows",
          href: "/download/windows",
        };
      case "linux":
        return {
          icon: "mdi:linux",
          label: "Download for Linux",
          href: "/download/linux",
        };
      default:
        return {
          icon: "mdi:apple",
          label: "Download for Mac",
          href: "/download/apple-silicon",
        };
    }
  };

  const { icon, label, href } = getPlatformData();

  return (
    <a
      href={href}
      download
      className={cn([
        "group px-6 h-12 flex items-center justify-center text-base sm:text-lg",
        "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full",
        "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
        "transition-all",
      ])}
    >
      <Icon icon={icon} className="text-xl mr-2" />
      {label}
    </a>
  );
}

import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";

export function DownloadButton() {
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
      <Icon icon="mdi:apple" className="text-xl mr-2" />
      Download for Mac
    </a>
  );
}

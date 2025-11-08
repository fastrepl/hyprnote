import { cn } from "@hypr/utils";

import { X } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import type { BannerType } from "./types";

export function Banner({
  banner,
  onDismiss,
}: {
  banner: BannerType;
  onDismiss?: () => void;
}) {
  return (
    <div className="overflow-hidden px-1 py-2">
      <div
        className={cn([
          "relative group overflow-hidden rounded-lg",
          "flex flex-col gap-2",
          "bg-white border border-neutral-200 shadow-sm p-4",
        ])}
      >
        {banner.dismissible && onDismiss && (
          <Button
            onClick={onDismiss}
            size="icon"
            variant="ghost"
            aria-label="Dismiss banner"
            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </Button>
        )}

        {banner.icon && (
          <div className="flex items-center gap-2">
            {banner.icon}
            <h3 className="text-lg font-bold text-neutral-900">
              {banner.title}
            </h3>
          </div>
        )}

        {!banner.icon && (
          <h3 className="text-lg font-bold text-neutral-900">
            {banner.title}
          </h3>
        )}

        <p className="text-sm">{banner.description}</p>

        <div className="flex flex-col gap-2 mt-1">
          {banner.primaryAction && (
            <Button onClick={banner.primaryAction.onClick} className="w-full">
              {banner.primaryAction.label}
            </Button>
          )}
          {banner.secondaryAction && (
            <Button onClick={banner.secondaryAction.onClick} variant="outline" className="w-full">
              {banner.secondaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

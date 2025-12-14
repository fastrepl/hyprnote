import { X } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import type { BannerType } from "./types";

export function Banner({
  banner,
  onDismiss,
}: {
  banner: BannerType;
  onDismiss?: () => void;
}) {
  return (
    <div className="overflow-hidden p-1">
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
            className={cn([
              "absolute top-1.5 right-1.5 size-6",
              "opacity-0 group-hover:opacity-50 hover:!opacity-100",
              "hover:bg-neutral-200",
              "transition-all duration-200",
            ])}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        )}

        {(banner.icon || banner.title) && (
          <div className="flex items-center gap-2">
            {banner.icon}
            {banner.title && (
              <h3 className="text-lg font-bold text-neutral-900">
                {banner.title}
              </h3>
            )}
          </div>
        )}

        <div className="text-sm">{banner.description}</div>

        <div className="flex flex-col gap-2 mt-1">
          {banner.primaryAction && (
            <Button
              onClick={banner.primaryAction.onClick}
              className="w-full rounded-full bg-gradient-to-t from-stone-600 to-stone-500"
            >
              {banner.primaryAction.label}
            </Button>
          )}
          {banner.secondaryAction && (
            <Button
              onClick={banner.secondaryAction.onClick}
              variant="outline"
              className="w-full rounded-full bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900"
            >
              {banner.secondaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

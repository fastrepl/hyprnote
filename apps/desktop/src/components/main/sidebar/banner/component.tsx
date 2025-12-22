import { X } from "lucide-react";

import { cn } from "@hypr/utils";

import type { BannerType } from "./types";

export function Banner({
  banner,
  onDismiss,
}: {
  banner: BannerType;
  onDismiss?: () => void;
}) {
  const hasProgress = banner.progress !== undefined && banner.progress >= 0;

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
          <button
            onClick={onDismiss}
            aria-label="Dismiss banner"
            className={cn([
              "absolute top-1.5 right-1.5 size-6 flex items-center justify-center rounded",
              "opacity-0 group-hover:opacity-50 hover:!opacity-100",
              "hover:bg-neutral-200",
              "transition-all duration-200",
            ])}
          >
            <X className="w-3.5 h-3.5" />
          </button>
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
            <div className="relative w-full overflow-hidden rounded-full">
              <button
                onClick={banner.primaryAction.onClick}
                className="relative w-full py-2 rounded-full bg-gradient-to-t from-stone-600 to-stone-500 text-white text-sm font-medium duration-150 hover:scale-[1.01] active:scale-[0.99] z-10"
              >
                <span className="relative z-10">
                  {banner.primaryAction.label}
                </span>
              </button>
              {hasProgress && (
                <div
                  className="absolute inset-0 bg-gradient-to-t from-stone-700 to-stone-600 transition-all duration-300"
                  style={{ width: `${banner.progress}%` }}
                />
              )}
            </div>
          )}
          {banner.secondaryAction && (
            <button
              onClick={banner.secondaryAction.onClick}
              className="w-full py-2 rounded-full bg-gradient-to-t from-neutral-200 to-neutral-100 text-neutral-900 text-sm font-medium duration-150 hover:scale-[1.01] active:scale-[0.99]"
            >
              {banner.secondaryAction.label}
            </button>
          )}
          {!banner.primaryAction && !banner.secondaryAction && hasProgress && (
            <div className="relative w-full h-9 rounded-full overflow-hidden bg-gradient-to-t from-stone-200 to-stone-100">
              <div
                className="absolute inset-0 bg-gradient-to-t from-stone-600 to-stone-500 transition-all duration-300"
                style={{ width: `${banner.progress}%` }}
              />
              <div
                className={cn([
                  "absolute inset-0 flex items-center justify-center text-sm font-medium transition-colors duration-300",
                  (banner.progress ?? 0) > 50 ? "text-white" : "text-stone-700",
                ])}
              >
                {Math.round(banner.progress ?? 0)}%
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

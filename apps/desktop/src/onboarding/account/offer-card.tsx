import type { ReactNode } from "react";

import { cn } from "@anlg/utils";

export function TrialOfferCard({
  days,
  previousDays,
  title,
  subtitle,
  badge,
}: {
  days: number;
  previousDays?: number;
  title: ReactNode;
  subtitle: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div
      className={cn([
        "relative flex w-full max-w-md items-center gap-5 rounded-2xl px-5 py-4",
        "border border-amber-200/70 bg-linear-to-br from-amber-50/95 to-white/90",
        "shadow-[0_6px_24px_-12px_rgba(146,64,14,0.35)]",
      ])}
    >
      {badge && (
        <span className="text-muted-foreground absolute -top-2.5 right-3 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[11px]">
          {badge}
        </span>
      )}
      <div className="flex shrink-0 flex-col items-center">
        <div className="flex items-baseline gap-1.5">
          {previousDays !== undefined && (
            <>
              <span className="font-hand text-2xl text-neutral-400 line-through decoration-2">
                {previousDays}
              </span>
              <span className="text-sm text-amber-600" aria-hidden="true">
                →
              </span>
            </>
          )}
          <span className="font-hand text-4xl leading-none font-semibold text-amber-800">
            {days}
          </span>
        </div>
        <span className="mt-1 text-[10px] font-medium tracking-[0.2em] text-amber-700 uppercase">
          days
        </span>
      </div>
      <div className="h-10 w-px shrink-0 bg-amber-200/80" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-foreground text-sm font-semibold">{title}</span>
        <span className="text-muted-foreground text-xs">{subtitle}</span>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

import { cn } from "@anlg/utils";

export function TrialOfferCard({
  days,
  previousDays,
  icon,
  title,
  subtitle,
}: {
  days: number;
  previousDays?: number;
  icon?: ReactNode;
  title: ReactNode;
  subtitle: ReactNode;
}) {
  return (
    <div
      className={cn([
        "flex w-full max-w-[440px] items-center gap-6 rounded-[20px] py-5 pr-6 pl-7",
        "border border-amber-900/10 bg-white/75 backdrop-blur-md",
        "shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_12px_32px_-16px_rgba(120,53,15,0.35)]",
      ])}
    >
      <div className="flex shrink-0 flex-col items-center">
        <div className="flex items-baseline gap-1.5">
          {previousDays !== undefined && (
            <>
              <span className="font-hand text-[26px] leading-none text-neutral-400 line-through decoration-neutral-400/80 decoration-[1.5px]">
                {previousDays}
              </span>
              <span className="text-xs text-amber-700/70" aria-hidden="true">
                →
              </span>
            </>
          )}
          <span className="font-hand text-[44px] leading-[0.9] font-semibold text-amber-800">
            {days}
          </span>
        </div>
        <span className="mt-1.5 text-[10px] font-semibold tracking-[0.22em] text-amber-800/70 uppercase">
          days
        </span>
      </div>
      <div className="h-11 w-px shrink-0 bg-amber-900/10" />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-foreground flex items-center gap-1.5 text-[15px] font-semibold tracking-[-0.01em]">
          {icon}
          {title}
        </span>
        <span className="text-muted-foreground text-[13px]">{subtitle}</span>
      </div>
    </div>
  );
}

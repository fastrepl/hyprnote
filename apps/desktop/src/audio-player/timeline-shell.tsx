import type { MouseEvent, ReactNode } from "react";

import { cn } from "@anlg/utils";

export function TimelineMeta({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground inline-flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums select-none">
      {children}
    </div>
  );
}

export function TimelineShell({
  contentClassName,
  leading,
  meta,
  main,
  onContextMenu,
}: {
  contentClassName?: string;
  leading: ReactNode;
  meta?: ReactNode;
  main: ReactNode;
  onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className="w-full rounded-xl border border-border/60 bg-muted/25 select-none"
      onContextMenu={onContextMenu}
    >
      <div
        className={cn([
          "flex items-center gap-2 px-2.5 py-2",
          "w-full max-w-full",
          contentClassName,
        ])}
      >
        {leading}
        {meta}
        <div className="min-w-0 flex-1">{main}</div>
      </div>
    </div>
  );
}

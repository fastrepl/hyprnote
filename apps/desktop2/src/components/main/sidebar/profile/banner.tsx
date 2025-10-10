import { clsx } from "clsx";
import { ArrowRight, Zap } from "lucide-react";
import { useCallback } from "react";

export function Trial() {
  const handleClickTryPro = useCallback(() => {
    console.log("Try Hyprnote Pro");
  }, []);

  return (
    <button
      onClick={handleClickTryPro}
      className={clsx(
        "group",
        "mx-4 mb-1.5 w-[calc(100%-2rem)]",
        "rounded-lg",
        "border border-slate-200",
        "bg-white",
        "p-2.5",
        "transition-colors hover:bg-slate-50",
        "text-left",
      )}
    >
      <div className={clsx("mb-1.5", "flex items-center gap-1.5")}>
        <Zap className={clsx("h-3.5 w-3.5 flex-shrink-0", "text-slate-700")} />
        <span className={clsx("text-xs font-semibold text-slate-900")}>Hyprnote Pro</span>
      </div>
      <div className={clsx("mb-1.5", "text-[11px] leading-snug text-slate-600")}>
        Free trial for smarter meetings
      </div>
      <div className={clsx("flex items-center gap-1", "text-xs font-medium text-slate-900")}>
        <span>Start Trial</span>
        <ArrowRight className={clsx("h-3 w-3 flex-shrink-0", "transition-transform group-hover:translate-x-0.5")} />
      </div>
    </button>
  );
}

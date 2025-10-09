import { clsx } from "clsx";
import { ArrowRight, Zap } from "lucide-react";
import { useCallback } from "react";

export function Trial() {
  const handleClickTryPro = useCallback(() => {
    console.log("Try Hyprnote Pro");
  }, []);

  return (
    <div
      className={clsx(
        "mx-4 mb-1.5",
        "rounded-lg",
        "border border-slate-200",
        "bg-slate-50",
        "p-2.5",
      )}
    >
      <div className={clsx("mb-1.5", "flex items-center gap-2")}>
        <Zap className={clsx("h-4 w-4", "text-slate-700")} />
        <span className={clsx("text-sm font-semibold text-slate-900")}>Try Hyprnote Pro</span>
      </div>
      <button
        onClick={handleClickTryPro}
        className={clsx(
          "flex w-full items-center justify-center gap-2",
          "rounded-md",
          "bg-slate-900",
          "px-3 py-1.5",
          "text-sm font-semibold text-white",
          "transition-colors hover:bg-slate-800",
        )}
      >
        <span>Free Trial for a Week</span>
        <ArrowRight className={clsx("h-3.5 w-3.5")} />
      </button>
      <div className={clsx("mt-1.5", "text-center", "text-xs text-slate-500")}>
        Experience smarter meetings with free trial.
      </div>
    </div>
  );
}

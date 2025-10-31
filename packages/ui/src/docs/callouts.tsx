import { cn } from "@hypr/utils";
import { AlertCircle, Info as InfoIcon, Lightbulb } from "lucide-react";

interface CalloutProps {
  children: React.ReactNode;
  className?: string;
}

export function Info({ children, className }: CalloutProps) {
  return (
    <div
      className={cn(
        "my-4 flex gap-3 rounded-none border border-stone-300 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900/50",
        className,
      )}
    >
      <InfoIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-stone-600 dark:text-stone-400" />
      <div className="flex-1 text-sm text-stone-700 dark:text-stone-300">
        {children}
      </div>
    </div>
  );
}

export function Note({ children, className }: CalloutProps) {
  return (
    <div
      className={cn(
        "my-4 flex gap-3 rounded-none border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/50",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-600 dark:text-neutral-400" />
      <div className="flex-1 text-sm text-neutral-700 dark:text-neutral-300">
        {children}
      </div>
    </div>
  );
}

export function Tip({ children, className }: CalloutProps) {
  return (
    <div
      className={cn(
        "my-4 flex gap-3 rounded-none border border-stone-300 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900/50",
        className,
      )}
    >
      <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-stone-600 dark:text-stone-400" />
      <div className="flex-1 text-sm text-stone-700 dark:text-stone-300">
        {children}
      </div>
    </div>
  );
}

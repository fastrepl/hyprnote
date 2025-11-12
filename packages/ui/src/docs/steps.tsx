import { cn } from "@hypr/utils";

interface StepProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Step({ title, children, className }: StepProps) {
  return (
    <div className={cn(["relative flex gap-4", className])}>
      <div className="flex flex-col items-center">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-none border-2 border-neutral-900 bg-white text-xs font-medium text-neutral-900 dark:border-neutral-100 dark:bg-neutral-950 dark:text-neutral-100">
          <div className="h-2 w-2 rounded-none bg-neutral-900 dark:bg-neutral-100" />
        </div>
        <div className="mt-1 h-full w-px bg-neutral-300 dark:bg-neutral-700" />
      </div>
      <div className="flex-1 pb-6">
        <h3 className="mb-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {title}
        </h3>
        <div className="text-sm text-neutral-700 dark:text-neutral-300">
          {children}
        </div>
      </div>
    </div>
  );
}

interface StepsProps {
  children: React.ReactNode;
  className?: string;
}

export function Steps({ children, className }: StepsProps) {
  return (
    <div
      className={cn(
        [
          "my-4 rounded-none border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900",
          className,
        ],
      )}
    >
      {children}
    </div>
  );
}

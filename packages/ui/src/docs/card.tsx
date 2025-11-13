import { cn } from "@hypr/utils";

interface CardProps {
  title?: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, icon, children, className }: CardProps) {
  return (
    <div
      className={cn([
        "rounded-none border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900",
        className,
      ])}
    >
      {(title || icon) && (
        <div className="mb-3 flex items-center gap-2">
          {icon && (
            <span className="text-neutral-600 dark:text-neutral-400">
              {icon}
            </span>
          )}
          {title && (
            <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {title}
            </h3>
          )}
        </div>
      )}
      <div className="text-sm text-neutral-700 dark:text-neutral-300">
        {children}
      </div>
    </div>
  );
}

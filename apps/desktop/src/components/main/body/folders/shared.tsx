import { type ReactNode } from "react";

export function Section({
  icon,
  title,
  action,
  children,
  emptyMessage,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  emptyMessage?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        {action}
      </div>
      {children || (
        <div className="text-sm text-muted-foreground py-4">
          {emptyMessage || "No items"}
        </div>
      )}
    </div>
  );
}

import { ChevronRight, Loader2 } from "lucide-react";
import { type ReactNode } from "react";

import { cn } from "@hypr/ui/lib/utils";

export function Disclosure(
  {
    icon,
    title,
    children,
    disabled,
  }: {
    icon: ReactNode;
    title: ReactNode;
    children: ReactNode;
    disabled?: boolean;
  },
) {
  return (
    <details
      className={cn([
        "group px-2 py-1 my-2 border rounded-md transition-colors",
        "cursor-pointer border-gray-200 hover:border-gray-300",
      ])}
    >
      <summary
        className={cn([
          "w-full",
          "text-xs text-gray-500",
          "select-none list-none marker:hidden",
          "flex items-center gap-2",
        ])}
      >
        {disabled ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        {(!disabled && icon) && <span className="flex-shrink-0">{icon}</span>}
        <span
          className={cn([
            "flex-1 truncate",
            "group-open:font-medium",
          ])}
        >
          {title}
        </span>
        <ChevronRight className="w-3 h-3 flex-shrink-0 transition-transform group-open:rotate-90" />
      </summary>
      <div className="mt-1 pt-2 px-1 border-t border-gray-200">
        {children}
      </div>
    </details>
  );
}

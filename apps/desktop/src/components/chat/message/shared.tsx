import { ChevronRight, Loader2 } from "lucide-react";
import { type ReactNode } from "react";

import { cn } from "@hypr/ui/lib/utils";

export function MessageContainer({
  align = "start",
  children,
}: {
  align?: "start" | "end";
  children: ReactNode;
}) {
  return (
    <div
      className={cn([
        "flex px-3 py-2",
        align === "end" ? "justify-end" : "justify-start",
      ])}
    >
      {children}
    </div>
  );
}

export function MessageBubble({
  variant = "assistant",
  withActionButton,
  children,
}: {
  variant?: "user" | "assistant" | "error" | "loading";
  withActionButton?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn([
        "rounded-2xl px-3 py-1 text-sm",
        variant === "user" && "bg-blue-100 text-gray-800",
        variant === "assistant" && "bg-gray-100 text-gray-800",
        variant === "loading" && "bg-gray-100 text-gray-800",
        variant === "error" && "bg-red-50 text-red-600 border border-red-200",
        withActionButton && "relative group",
      ])}
    >
      {children}
    </div>
  );
}

export function ActionButton({
  onClick,
  variant = "default",
  icon: Icon,
  label,
}: {
  onClick: () => void;
  variant?: "default" | "error";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={cn([
        "absolute -top-1 -right-1",
        "opacity-0 group-hover:opacity-100",
        "transition-opacity",
        "p-1 rounded-full",
        variant === "default" && [
          "bg-gray-200 hover:bg-gray-300",
          "text-gray-600 hover:text-gray-800",
        ],
        variant === "error" && [
          "bg-red-100 hover:bg-red-200",
          "text-red-600 hover:text-red-800",
        ],
      ])}
    >
      <Icon className="w-3 h-3" />
    </button>
  );
}

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

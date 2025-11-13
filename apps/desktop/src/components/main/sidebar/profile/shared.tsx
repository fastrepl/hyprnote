import { cn } from "@hypr/utils";

export function MenuItem({
  icon: Icon,
  label,
  badge,
  suffixIcon: SuffixIcon,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number | React.ReactNode;
  suffixIcon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg",
        "px-4 py-1.5",
        "text-sm text-black",
        "transition-colors hover:bg-neutral-100",
      )}
      onClick={onClick}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0", "text-black")} />
      <span className={cn(["flex-1", "text-left", "truncate"])}>{label}</span>
      {badge &&
        (typeof badge === "number" ? (
          <span
            className={cn(
              "rounded-full",
              "px-2 py-0.5",
              "bg-red-500",
              "text-xs font-semibold text-white",
            )}
          >
            {badge}
          </span>
        ) : (
          badge
        ))}
      {SuffixIcon && (
        <SuffixIcon
          className={cn("h-4 w-4 flex-shrink-0", "text-neutral-400")}
        />
      )}
    </button>
  );
}

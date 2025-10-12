import { clsx } from "clsx";

export function MenuItem(
  { icon: Icon, label, badge, onClick }: {
    icon: any;
    label: string;
    badge?: number | React.ReactNode;
    onClick: () => void;
  },
) {
  return (
    <button
      className={clsx(
        "flex w-full items-center gap-2.5",
        "px-4 py-1.5",
        "text-sm text-black",
        "transition-colors hover:bg-slate-100",
      )}
      onClick={onClick}
    >
      <Icon className={clsx("h-4 w-4 flex-shrink-0", "text-black")} />
      <span className={clsx("flex-1", "text-left")}>{label}</span>
      {badge && (
        typeof badge === "number"
          ? (
            <span
              className={clsx(
                "rounded-full",
                "px-2 py-0.5",
                "bg-red-500",
                "text-xs font-semibold text-white",
              )}
            >
              {badge}
            </span>
          )
          : badge
      )}
    </button>
  );
}

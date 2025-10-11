import { clsx } from "clsx";

import { type Tab } from "../../../store/zustand/tabs";

export type TabItem = (props: {
  tab: Tab;
  handleClose: (tab: Tab) => void;
  handleSelect: (tab: Tab) => void;
}) => React.ReactNode;

export function TabItemBase(
  { icon, title, active, handleClose, handleSelect }: {
    icon: React.ReactNode;
    title: string;
    active: boolean;
    handleClose: () => void;
    handleSelect: () => void;
  },
) {
  return (
    <div
      onClick={handleSelect}
      className={clsx([
        "flex items-center gap-2 cursor-pointer group",
        "min-w-[100px] max-w-[200px] h-full px-2",
        active
          ? "bg-background text-foreground rounded-lg border"
          : "bg-muted/50 hover:bg-muted text-muted-foreground rounded-lg border",
      ])}
    >
      <div className="flex flex-row items-center gap-1 text-sm flex-1 min-w-0">
        <span className="flex-shrink-0">
          {icon}
        </span>
        <span className="truncate">{title}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        className={clsx([
          "text-xs flex-shrink-0 transition-opacity",
          active
            ? "text-muted-foreground hover:text-foreground"
            : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground",
        ])}
      >
        ✕
      </button>
    </div>
  );
}

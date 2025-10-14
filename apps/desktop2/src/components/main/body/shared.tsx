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
        "bg-color1 rounded-lg border",
        active ? "text-black border-black" : "text-color3 border-transparent",
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
            ? "text-color4"
            : "opacity-0 group-hover:opacity-100 text-color3",
        ])}
      >
        ✕
      </button>
    </div>
  );
}

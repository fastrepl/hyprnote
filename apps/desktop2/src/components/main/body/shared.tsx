import { clsx } from "clsx";

import { ContextMenuItem } from "@hypr/ui/components/ui/context-menu";
import { type Tab } from "../../../store/zustand/tabs";
import { InteractiveButton } from "../../interactive-button";

type TabItemProps = { tab: Tab } & {
  handleSelectThis: (tab: Tab) => void;
  handleCloseThis: (tab: Tab) => void;
  handleCloseOthers: () => void;
  handleCloseAll: () => void;
};

type TabItemBaseProps = { icon: React.ReactNode; title: string; active: boolean } & {
  handleCloseThis: () => void;
  handleSelectThis: () => void;
  handleCloseOthers: () => void;
  handleCloseAll: () => void;
};

export type TabItem = (props: TabItemProps) => React.ReactNode;

export function TabItemBase(
  {
    icon,
    title,
    active,
    handleCloseThis,
    handleSelectThis,
    handleCloseOthers,
    handleCloseAll,
  }: TabItemBaseProps,
) {
  const contextMenu = (
    <>
      <ContextMenuItem onClick={handleCloseThis}>close tab</ContextMenuItem>
      <ContextMenuItem onClick={handleCloseOthers}>close others</ContextMenuItem>
      <ContextMenuItem onClick={handleCloseAll}>close all</ContextMenuItem>
    </>
  );

  return (
    <InteractiveButton
      asChild
      contextMenu={contextMenu}
      onClick={handleSelectThis}
      className={clsx([
        "flex items-center gap-2 cursor-pointer group",
        "min-w-[100px] max-w-[200px] h-full px-2",
        "bg-color1 rounded-lg border",
        active ? "text-black border-black" : "text-color3 border-transparent",
      ])}
    >
      <div className="flex flex-row items-center gap-1 text-sm flex-1 min-w-0">
        <span className="flex-shrink-0">{icon}</span>
        <span className="truncate">{title}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleCloseThis();
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
    </InteractiveButton>
  );
}

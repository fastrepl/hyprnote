import { clsx } from "clsx";
import { X } from "lucide-react";

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
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      handleCloseThis();
    }
  };

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
      onMouseDown={handleMouseDown}
      className={clsx([
        "flex items-center gap-2 cursor-pointer group",
        "w-48 h-full px-2",
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
          "flex-shrink-0 transition-opacity",
          active
            ? "opacity-100 text-color4"
            : "opacity-0 group-hover:opacity-100 text-color3",
        ])}
      >
        <X size={14} />
      </button>
    </InteractiveButton>
  );
}

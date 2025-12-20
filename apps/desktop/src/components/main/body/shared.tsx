import { Pin, X } from "lucide-react";
import { useState } from "react";

import { ContextMenuItem } from "@hypr/ui/components/ui/context-menu";
import { Kbd, KbdGroup } from "@hypr/ui/components/ui/kbd";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/utils";

import { useCmdKeyPressed } from "../../../hooks/useCmdKeyPressed";
import { type Tab } from "../../../store/zustand/tabs";
import { InteractiveButton } from "../../interactive-button";

type TabItemProps<T extends Tab = Tab> = { tab: T; tabIndex?: number } & {
  handleSelectThis: (tab: T) => void;
  handleCloseThis: (tab: T) => void;
  handleCloseOthers: () => void;
  handleCloseAll: () => void;
  handlePinThis: (tab: T) => void;
  handleUnpinThis: (tab: T) => void;
};

type TabItemBaseProps = {
  icon: React.ReactNode;
  title: React.ReactNode;
  selected: boolean;
  active?: boolean;
  finalizing?: boolean;
  pinned?: boolean;
  allowPin?: boolean;
  tabIndex?: number;
} & {
  handleCloseThis: () => void;
  handleSelectThis: () => void;
  handleCloseOthers: () => void;
  handleCloseAll: () => void;
  handlePinThis: () => void;
  handleUnpinThis: () => void;
};

export type TabItem<T extends Tab = Tab> = (
  props: TabItemProps<T>,
) => React.ReactNode;

export function TabItemBase({
  icon,
  title,
  selected,
  active = false,
  finalizing = false,
  pinned = false,
  allowPin = true,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
  handlePinThis,
  handleUnpinThis,
}: TabItemBaseProps) {
  const isCmdPressed = useCmdKeyPressed();
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 && !active) {
      e.preventDefault();
      e.stopPropagation();
      handleCloseThis();
    }
  };

  const contextMenu = !active ? (
    <>
      {allowPin &&
        (pinned ? (
          <ContextMenuItem onClick={handleUnpinThis}>unpin tab</ContextMenuItem>
        ) : (
          <ContextMenuItem onClick={handlePinThis}>pin tab</ContextMenuItem>
        ))}
      <ContextMenuItem onClick={handleCloseThis}>close tab</ContextMenuItem>
      <ContextMenuItem onClick={handleCloseOthers}>
        close others
      </ContextMenuItem>
      <ContextMenuItem onClick={handleCloseAll}>close all</ContextMenuItem>
    </>
  ) : undefined;

  const showShortcut = isCmdPressed && tabIndex !== undefined;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="h-full"
    >
      <InteractiveButton
        asChild
        contextMenu={contextMenu}
        onClick={handleSelectThis}
        onMouseDown={handleMouseDown}
        className={cn([
          "flex items-center gap-1 relative",
          "w-48 h-full px-2",
          "rounded-xl border",
          "cursor-pointer group",
          "transition-colors duration-200",
          active && selected && ["bg-red-50", "text-red-600", "border-red-400"],
          active && !selected && ["bg-red-50", "text-red-500", "border-0"],
          !active &&
            selected && ["bg-neutral-50", "text-black", "border-stone-400"],
          !active &&
            !selected && [
              "bg-neutral-50",
              "text-neutral-500",
              "border-transparent",
            ],
        ])}
      >
        <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
          <div className="flex-shrink-0 relative w-4 h-4">
            <div
              className={cn([
                "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
                isHovered ? "opacity-0" : "opacity-100",
              ])}
            >
              {finalizing ? (
                <Spinner size={16} />
              ) : active ? (
                <div className="relative size-2">
                  <div className="absolute inset-0 rounded-full bg-red-600"></div>
                  <div className="absolute inset-0 rounded-full bg-red-300 animate-ping"></div>
                </div>
              ) : pinned ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnpinThis();
                  }}
                  className={cn([
                    "flex items-center justify-center transition-colors",
                    selected && "text-neutral-700 hover:text-neutral-900",
                    !selected && "text-neutral-500 hover:text-neutral-700",
                  ])}
                >
                  <Pin size={14} />
                </button>
              ) : (
                icon
              )}
            </div>
            <div
              className={cn([
                "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
                isHovered ? "opacity-100" : "opacity-0",
              ])}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseThis();
                }}
                className={cn([
                  "flex items-center justify-center transition-colors",
                  active && "text-red-600 hover:text-red-700",
                  !active &&
                    selected &&
                    "text-neutral-700 hover:text-neutral-900",
                  !active &&
                    !selected &&
                    "text-neutral-500 hover:text-neutral-700",
                ])}
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <span className="truncate">{title}</span>
        </div>
        {showShortcut && (
          <div className="absolute top-[3px] right-2 pointer-events-none">
            <KbdGroup>
              <Kbd className={active ? "bg-red-200" : "bg-neutral-200"}>⌘</Kbd>
              <Kbd className={active ? "bg-red-200" : "bg-neutral-200"}>
                {tabIndex}
              </Kbd>
            </KbdGroup>
          </div>
        )}
      </InteractiveButton>
    </div>
  );
}

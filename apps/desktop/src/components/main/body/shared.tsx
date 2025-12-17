import { Square, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { Button } from "@hypr/ui/components/ui/button";
import { ContextMenuItem } from "@hypr/ui/components/ui/context-menu";
import { Kbd, KbdGroup } from "@hypr/ui/components/ui/kbd";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@hypr/ui/components/ui/popover";
import { cn } from "@hypr/utils";

import { useCmdKeyPressed } from "../../../hooks/useCmdKeyPressed";
import { type Tab } from "../../../store/zustand/tabs";
import { InteractiveButton } from "../../interactive-button";

type TabItemProps<T extends Tab = Tab> = { tab: T; tabIndex?: number } & {
  handleSelectThis: (tab: T) => void;
  handleCloseThis: (tab: T) => void;
  handleCloseOthers: () => void;
  handleCloseAll: () => void;
};

type TabItemBaseProps = {
  icon: React.ReactNode;
  title: React.ReactNode;
  selected: boolean;
  active?: boolean;
  tabIndex?: number;
} & {
  handleCloseThis: () => void;
  handleSelectThis: () => void;
  handleCloseOthers: () => void;
  handleCloseAll: () => void;
};

export type TabItem<T extends Tab = Tab> = (
  props: TabItemProps<T>,
) => React.ReactNode;

export function StopListeningPopover({
  open,
  onOpenChange,
  onCancel,
  onConfirm,
  anchorRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}) {
  useHotkeys(
    "escape",
    () => {
      if (open) {
        onCancel();
      }
    },
    { enabled: open, enableOnFormTags: true },
    [open, onCancel],
  );

  useHotkeys(
    "enter",
    () => {
      if (open) {
        onConfirm();
      }
    },
    { enabled: open, enableOnFormTags: true },
    [open, onConfirm],
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor
        virtualRef={
          anchorRef as React.RefObject<{ getBoundingClientRect: () => DOMRect }>
        }
      />
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-64 p-3 rounded-xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p className="text-sm text-neutral-700 mb-3">
          Do you want to stop listening?
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1"
            onClick={onCancel}
          >
            Cancel
            <Kbd className="ml-1">esc</Kbd>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="flex-1 gap-1"
            onClick={onConfirm}
          >
            <Square className="w-3 h-3 fill-current" />
            Stop
            <Kbd className="ml-1 bg-red-400/30 text-white">enter</Kbd>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TabItemBase({
  icon,
  title,
  selected,
  active = false,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
  showStopListeningPopover = false,
  onStopListeningPopoverChange,
  onStopListeningConfirm,
}: TabItemBaseProps & {
  showStopListeningPopover?: boolean;
  onStopListeningPopoverChange?: (open: boolean) => void;
  onStopListeningConfirm?: () => void;
}) {
  const isCmdPressed = useCmdKeyPressed();
  const [isHovered, setIsHovered] = useState(false);
  const tabRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 && !active) {
      e.preventDefault();
      e.stopPropagation();
      handleCloseThis();
    }
  };

  const handleCloseClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (active && onStopListeningPopoverChange) {
        onStopListeningPopoverChange(true);
      } else {
        handleCloseThis();
      }
    },
    [active, handleCloseThis, onStopListeningPopoverChange],
  );

  const handlePopoverCancel = useCallback(() => {
    onStopListeningPopoverChange?.(false);
  }, [onStopListeningPopoverChange]);

  const handlePopoverConfirm = useCallback(() => {
    onStopListeningPopoverChange?.(false);
    onStopListeningConfirm?.();
  }, [onStopListeningPopoverChange, onStopListeningConfirm]);

  const contextMenu = !active ? (
    <>
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
      ref={tabRef}
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
              {active ? (
                <div className="relative size-2">
                  <div className="absolute inset-0 rounded-full bg-red-600"></div>
                  <div className="absolute inset-0 rounded-full bg-red-300 animate-ping"></div>
                </div>
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
                onClick={handleCloseClick}
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
      {active && onStopListeningPopoverChange && (
        <StopListeningPopover
          open={showStopListeningPopover}
          onOpenChange={onStopListeningPopoverChange}
          onCancel={handlePopoverCancel}
          onConfirm={handlePopoverConfirm}
          anchorRef={tabRef}
        />
      )}
    </div>
  );
}

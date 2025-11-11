import { ContextMenuItem } from "@hypr/ui/components/ui/context-menu";
import { DancingSticks } from "@hypr/ui/components/ui/dancing-sticks";
import { Kbd, KbdGroup } from "@hypr/ui/components/ui/kbd";
import { cn } from "@hypr/utils";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { useCmdKeyPressed } from "../../../hooks/useCmdKeyPressed";
import { type Tab } from "../../../store/zustand/tabs";
import { InteractiveButton } from "../../interactive-button";

type TabItemProps<T extends Tab = Tab> = { tab: T; tabIndex?: number } & {
  handleSelectThis: (tab: T) => void;
  handleCloseThis: (tab: T) => void;
  handleCloseOthers: () => void;
  handleCloseAll: () => void;
};

type TabItemBaseProps =
  & { icon: React.ReactNode; title: string; selected: boolean; active?: boolean; tabIndex?: number }
  & {
    handleCloseThis: () => void;
    handleSelectThis: () => void;
    handleCloseOthers: () => void;
    handleCloseAll: () => void;
  };

export type TabItem<T extends Tab = Tab> = (props: TabItemProps<T>) => React.ReactNode;

export function TabItemBase(
  {
    icon,
    title,
    selected,
    active = false,
    tabIndex,
    handleCloseThis,
    handleSelectThis,
    handleCloseOthers,
    handleCloseAll,
  }: TabItemBaseProps,
) {
  const isCmdPressed = useCmdKeyPressed();
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 && !active) {
      e.preventDefault();
      e.stopPropagation();
      handleCloseThis();
    }
  };

  const contextMenu = !active
    ? (
      <>
        <ContextMenuItem onClick={handleCloseThis}>close tab</ContextMenuItem>
        <ContextMenuItem onClick={handleCloseOthers}>close others</ContextMenuItem>
        <ContextMenuItem onClick={handleCloseAll}>close all</ContextMenuItem>
      </>
    )
    : undefined;

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
          "flex items-center gap-1 cursor-pointer group relative",
          "w-48 h-full pl-2 pr-2",
          "rounded-lg border",
          "transition-colors duration-200",
          active && selected
            ? ["bg-red-50", "text-red-600", "border-red-500"]
            : active
            ? ["bg-red-50", "text-red-500", "border-0"]
            : selected
            ? ["bg-neutral-50", "text-black", "border-black"]
            : ["bg-neutral-50", "text-neutral-500", "border-transparent"],
        ])}
      >
        <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
          <div className="flex-shrink-0 relative w-4 h-4">
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
                isHovered ? "opacity-0" : "opacity-100",
              )}
            >
              {active
                ? (
                  <div className="relative size-2">
                    <div className="absolute inset-0 rounded-full bg-red-600"></div>
                    <div className="absolute inset-0 rounded-full bg-red-300 animate-ping"></div>
                  </div>
                )
                : icon}
            </div>
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
                isHovered ? "opacity-100" : "opacity-0",
              )}
            >
              {active
                ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseThis();
                    }}
                    className="flex items-center justify-center text-red-600 hover:text-red-700"
                  >
                    <span className="w-3 h-3 bg-red-600 hover:bg-red-700 rounded-none transition-colors" />
                  </button>
                )
                : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseThis();
                    }}
                    className={cn(
                      "flex items-center justify-center transition-colors",
                      selected
                        ? "text-neutral-700 hover:text-neutral-900"
                        : "text-neutral-500 hover:text-neutral-700",
                    )}
                  >
                    <X size={16} />
                  </button>
                )}
            </div>
          </div>
          <span className="truncate">{title}</span>
        </div>
        {showShortcut && (
          <div className="absolute top-[3px] right-2 pointer-events-none">
            <KbdGroup>
              <Kbd className={active ? "bg-red-200" : "bg-neutral-200"}>⌘</Kbd>
              <Kbd className={active ? "bg-red-200" : "bg-neutral-200"}>{tabIndex}</Kbd>
            </KbdGroup>
          </div>
        )}
      </InteractiveButton>
    </div>
  );
}

type SoundIndicatorProps = {
  value: number | Array<number>;
  color?: string;
  size?: "default" | "long";
  height?: number;
  width?: number;
  stickWidth?: number;
  gap?: number;
};

export function SoundIndicator({
  value,
  color,
  size = "long",
  height,
  width,
  stickWidth,
  gap,
}: SoundIndicatorProps) {
  const [amplitude, setAmplitude] = useState(0);

  const u16max = 65535;
  useEffect(() => {
    const sample = Array.isArray(value)
      ? (value.reduce((sum, v) => sum + v, 0) / value.length) / u16max
      : value / u16max;
    setAmplitude(Math.min(sample, 1));
  }, [value]);

  return (
    <DancingSticks
      amplitude={amplitude}
      color={color}
      size={size}
      height={height}
      width={width}
      stickWidth={stickWidth}
      gap={gap}
    />
  );
}

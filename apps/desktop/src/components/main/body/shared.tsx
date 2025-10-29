import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { ContextMenuItem } from "@hypr/ui/components/ui/context-menu";
import { DancingSticks } from "@hypr/ui/components/ui/dancing-sticks";
import { Kbd, KbdGroup } from "@hypr/ui/components/ui/kbd";

import { cn } from "@hypr/utils";
import { useListener } from "../../../contexts/listener";
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
  const amplitude = useListener((state) => (active ? state.amplitude : ZERO_AMPLITUDE));

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

  const showShortcut = isCmdPressed && tabIndex !== undefined;

  return (
    <InteractiveButton
      asChild
      contextMenu={contextMenu}
      onClick={handleSelectThis}
      onMouseDown={handleMouseDown}
      className={cn([
        "flex items-center gap-1 cursor-pointer group relative",
        "w-48 h-full pl-2 pr-1",
        "rounded-lg border",
        active
          ? ["bg-red-50", "text-red-600", "border-red-300"]
          : ["bg-neutral-50", selected ? ["text-black", "border-black"] : ["text-neutral-500", "border-transparent"]],
      ])}
    >
      <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
        <div className="flex-shrink-0">
          {active
            ? (
              <SoundIndicator
                value={[amplitude.mic, amplitude.speaker]}
                color="#ef4444"
                size="long"
                height={24}
                width={16}
                stickWidth={8}
                gap={1}
              />
            )
            : icon}
        </div>
        <span className="truncate">{title}</span>
      </div>
      <Button
        onClick={(e) => {
          e.stopPropagation();
          handleCloseThis();
        }}
        className={cn([
          "flex-shrink-0 transition-opacity size-6",
          active
            ? "opacity-100 text-red-600"
            : selected
            ? "opacity-100 text-neutral-700"
            : "opacity-0 group-hover:opacity-100 text-neutral-500",
        ])}
        size="icon"
        variant="ghost"
      >
        <X size={14} />
      </Button>
      {showShortcut && (
        <div className="absolute top-[3px] right-2 pointer-events-none">
          <KbdGroup>
            <Kbd className="bg-neutral-200">⌘</Kbd>
            <Kbd className="bg-neutral-200">{tabIndex}</Kbd>
          </KbdGroup>
        </div>
      )}
    </InteractiveButton>
  );
}

const ZERO_AMPLITUDE = { mic: 0, speaker: 0 } as const;

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

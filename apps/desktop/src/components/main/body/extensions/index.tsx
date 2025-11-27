import { LoaderIcon, PuzzleIcon, XIcon } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { type PointerEvent, useEffect, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@hypr/ui/components/ui/context-menu";
import { cn } from "@hypr/utils";

import type { Tab } from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import {
  getExtensionComponent,
  getPanelInfoByExtensionId,
  loadExtensionUI,
} from "./registry";

type ExtensionTab = Extract<Tab, { type: "extension" }>;

export function TabItemExtension({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
}: {
  tab: ExtensionTab;
  tabIndex?: number;
  handleCloseThis: (tab: Tab) => void;
  handleSelectThis: (tab: Tab) => void;
  handleCloseOthers: () => void;
  handleCloseAll: () => void;
}) {
  const controls = useDragControls();

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Reorder.Item
          value={tab}
          dragListener={false}
          dragControls={controls}
          as="div"
          className={cn([
            "h-full flex items-center gap-1 px-2 rounded-lg cursor-pointer select-none",
            "hover:bg-neutral-100",
            tab.active && "bg-neutral-100",
          ])}
          onClick={() => handleSelectThis(tab)}
          onPointerDown={(e: PointerEvent) => controls.start(e)}
        >
          <PuzzleIcon size={14} className="text-neutral-500 shrink-0" />
          <span className="text-sm truncate max-w-[120px]">
            {tab.extensionId}
          </span>
          {tabIndex && (
            <span className="text-xs text-neutral-400 shrink-0">
              {tabIndex}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-5 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              handleCloseThis(tab);
            }}
          >
            <XIcon size={12} />
          </Button>
        </Reorder.Item>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => handleCloseThis(tab)}>
          Close
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCloseOthers}>
          Close Others
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleCloseAll}>Close All</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function TabContentExtension({ tab }: { tab: ExtensionTab }) {
  const [loadState, setLoadState] = useState<
    "idle" | "loading" | "loaded" | "error"
  >("idle");
  const [, forceUpdate] = useState({});

  const Component = getExtensionComponent(tab.extensionId);
  const panelInfo = getPanelInfoByExtensionId(tab.extensionId);

  useEffect(() => {
    if (Component) {
      setLoadState("loaded");
      return;
    }

    if (!panelInfo?.entry_path) {
      setLoadState("error");
      return;
    }

    setLoadState("loading");
    loadExtensionUI(tab.extensionId).then((success) => {
      setLoadState(success ? "loaded" : "error");
      if (success) {
        forceUpdate({});
      }
    });
  }, [tab.extensionId, Component, panelInfo?.entry_path]);

  if (loadState === "loading") {
    return (
      <StandardTabWrapper>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <LoaderIcon
              size={48}
              className="mx-auto text-neutral-300 mb-4 animate-spin"
            />
            <p className="text-neutral-500">Loading extension...</p>
          </div>
        </div>
      </StandardTabWrapper>
    );
  }

  const LoadedComponent = getExtensionComponent(tab.extensionId);

  if (!LoadedComponent) {
    return (
      <StandardTabWrapper>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <PuzzleIcon size={48} className="mx-auto text-neutral-300 mb-4" />
            <p className="text-neutral-500">
              {panelInfo
                ? `Extension panel "${panelInfo.title}" failed to load`
                : `Extension not found: ${tab.extensionId}`}
            </p>
            {panelInfo?.entry && (
              <p className="text-neutral-400 text-sm mt-2">
                Entry: {panelInfo.entry}
              </p>
            )}
          </div>
        </div>
      </StandardTabWrapper>
    );
  }

  return (
    <StandardTabWrapper>
      <LoadedComponent extensionId={tab.extensionId} state={tab.state} />
    </StandardTabWrapper>
  );
}

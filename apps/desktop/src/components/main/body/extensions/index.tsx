import { PuzzleIcon, XIcon } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { type PointerEvent, useCallback, useEffect, useRef } from "react";
import type { MergeableStore } from "tinybase";
import { useStores } from "tinybase/ui-react";

import { Button } from "@hypr/ui/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@hypr/ui/components/ui/context-menu";
import { cn } from "@hypr/utils";

import { createIframeSynchronizer } from "../../../../store/tinybase/iframe-sync";
import { type Store, STORE_ID } from "../../../../store/tinybase/main";
import type { Tab } from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import { getPanelInfoByExtensionId } from "./registry";

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
  const stores = useStores();
  const store = stores[STORE_ID] as unknown as Store | undefined;
  const panelInfo = getPanelInfoByExtensionId(tab.extensionId);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const synchronizerRef = useRef<ReturnType<
    typeof createIframeSynchronizer
  > | null>(null);

  const handleIframeLoad = useCallback(() => {
    if (!iframeRef.current || !store) return;

    if (synchronizerRef.current) {
      synchronizerRef.current.destroy();
    }

    const synchronizer = createIframeSynchronizer(
      store as unknown as MergeableStore,
      iframeRef.current,
    );
    synchronizerRef.current = synchronizer;
    synchronizer.startSync();
  }, [store]);

  useEffect(() => {
    return () => {
      if (synchronizerRef.current) {
        synchronizerRef.current.destroy();
        synchronizerRef.current = null;
      }
    };
  }, []);

  if (!panelInfo?.entry_path) {
    return (
      <StandardTabWrapper>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <PuzzleIcon size={48} className="mx-auto text-neutral-300 mb-4" />
            <p className="text-neutral-500">
              Extension not found: {tab.extensionId}
            </p>
          </div>
        </div>
      </StandardTabWrapper>
    );
  }

  const iframeSrc = `/app/ext-host?${new URLSearchParams({
    extensionId: tab.extensionId,
    entryPath: panelInfo.entry_path,
  }).toString()}`;

  return (
    <StandardTabWrapper>
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        onLoad={handleIframeLoad}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
        title={`Extension: ${tab.extensionId}`}
      />
    </StandardTabWrapper>
  );
}

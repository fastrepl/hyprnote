import { convertFileSrc } from "@tauri-apps/api/core";
import { AlertTriangleIcon, PuzzleIcon, XIcon } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import {
  Component,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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

interface ExtensionErrorBoundaryProps {
  children: ReactNode;
  extensionId: string;
  onRetry: () => void;
}

interface ExtensionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ExtensionErrorBoundary extends Component<
  ExtensionErrorBoundaryProps,
  ExtensionErrorBoundaryState
> {
  constructor(props: ExtensionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ExtensionErrorBoundaryState {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="max-w-md space-y-4 text-center p-4">
            <AlertTriangleIcon
              size={48}
              className="mx-auto text-amber-500 mb-4"
            />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Extension Error</h3>
              <p className="text-sm text-neutral-500">
                The extension "{this.props.extensionId}" encountered an error
              </p>
              {this.state.error && (
                <p className="text-xs text-neutral-400 font-mono bg-neutral-100 p-2 rounded overflow-auto max-h-24">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <Button size="sm" onClick={this.handleRetry}>
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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
  const [retryKey, setRetryKey] = useState(0);

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
    synchronizer.startSync().catch((err) => {
      console.error(
        `[extensions] Failed to start sync for extension ${tab.extensionId}:`,
        err,
      );
    });
  }, [store, tab.extensionId]);

  useEffect(() => {
    return () => {
      if (synchronizerRef.current) {
        synchronizerRef.current.destroy();
        synchronizerRef.current = null;
      }
    };
  }, []);

  const handleRetry = () => {
    setRetryKey((prev) => prev + 1);
  };

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

  const scriptUrl = convertFileSrc(panelInfo.entry_path);
  const searchParams: Record<string, string> = {
    extensionId: tab.extensionId,
    scriptUrl: scriptUrl,
  };
  if (panelInfo.styles_path) {
    searchParams.stylesUrl = convertFileSrc(panelInfo.styles_path);
  }
  const iframeSrc = `/app/ext-host?${new URLSearchParams(searchParams).toString()}`;

  return (
    <StandardTabWrapper>
      <ExtensionErrorBoundary
        key={retryKey}
        extensionId={tab.extensionId}
        onRetry={handleRetry}
      >
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          onLoad={handleIframeLoad}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title={`Extension: ${tab.extensionId}`}
        />
      </ExtensionErrorBoundary>
    </StandardTabWrapper>
  );
}

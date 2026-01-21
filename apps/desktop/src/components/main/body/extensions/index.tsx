import { convertFileSrc } from "@tauri-apps/api/core";
import { AlertTriangleIcon, BlocksIcon, PuzzleIcon } from "lucide-react";
import {
  Component,
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
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";

import { createIframeSynchronizer } from "../../../../store/tinybase/store/iframe-sync";
import { type Store, STORE_ID } from "../../../../store/tinybase/store/main";
import { type Tab, useTabs } from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";
import { ExtensionDetailsColumn } from "./details";
import { ExtensionsListColumn } from "./list";
import { getPanelInfoByExtensionId } from "./registry";

type ExtensionTab = Extract<Tab, { type: "extension" }>;
type ExtensionsTab = Extract<Tab, { type: "extensions" }>;

export const TabItemExtensions: TabItem<ExtensionsTab> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
  handlePinThis,
  handleUnpinThis,
}) => {
  return (
    <TabItemBase
      icon={<BlocksIcon className="w-4 h-4" />}
      title={"Extensions"}
      selected={tab.active}
      pinned={tab.pinned}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
      handlePinThis={() => handlePinThis(tab)}
      handleUnpinThis={() => handleUnpinThis(tab)}
    />
  );
};

export function TabContentExtensions({ tab }: { tab: ExtensionsTab }) {
  return (
    <StandardTabWrapper>
      <ExtensionsView tab={tab} />
    </StandardTabWrapper>
  );
}

function ExtensionsView({ tab }: { tab: ExtensionsTab }) {
  const updateExtensionsTabState = useTabs(
    (state) => state.updateExtensionsTabState,
  );

  const { selectedExtension } = tab.state;

  const setSelectedExtension = useCallback(
    (value: string | null) => {
      updateExtensionsTabState(tab, {
        ...tab.state,
        selectedExtension: value,
      });
    },
    [updateExtensionsTabState, tab],
  );

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
        <ExtensionsListColumn
          selectedExtension={selectedExtension}
          setSelectedExtension={setSelectedExtension}
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={70} minSize={50}>
        <ExtensionDetailsColumn selectedExtensionId={selectedExtension} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

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
          <div className="max-w-md flex flex-col gap-4 text-center p-4">
            <AlertTriangleIcon
              size={48}
              className="mx-auto text-amber-500 mb-4"
            />
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold">Extension Error</h3>
              <p className="text-sm text-neutral-500">
                The extension "{this.props.extensionId}" encountered an error
              </p>
              {this.state.error && (
                <p className="text-xs text-neutral-400 font-mono bg-neutral-100 p-2 rounded-xs overflow-auto max-h-24">
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
  handlePinThis,
  handleUnpinThis,
}: {
  tab: ExtensionTab;
  tabIndex?: number;
  handleCloseThis: (tab: Tab) => void;
  handleSelectThis: (tab: Tab) => void;
  handleCloseOthers: () => void;
  handleCloseAll: () => void;
  handlePinThis: () => void;
  handleUnpinThis: () => void;
}) {
  return (
    <TabItemBase
      icon={<PuzzleIcon className="w-4 h-4" />}
      title={tab.extensionId}
      selected={tab.active}
      pinned={tab.pinned}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
      handlePinThis={handlePinThis}
      handleUnpinThis={handleUnpinThis}
    />
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
      void synchronizerRef.current.destroy();
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
        void synchronizerRef.current.destroy();
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

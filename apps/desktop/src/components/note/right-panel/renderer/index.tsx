import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { QueryClient, useQueryClient } from "@tanstack/react-query";
import React, { Suspense, useCallback, useState } from "react";
import GridLayout, { Layout } from "react-grid-layout";

import { WidgetGroup } from "@hypr/extension-utils";
import { ExtensionName, importExtension } from "./extensions";

const componentCache: Record<string, React.LazyExoticComponent<any>> = {};

function getLazyWidget(
  extensionName: ExtensionName,
  groupName: string,
  widgetType: "oneByOne" | "twoByOne" | "twoByTwo" | "full",
): React.LazyExoticComponent<any> {
  const id = `${extensionName}-${groupName}-${widgetType}`;
  if (componentCache[id]) {
    return componentCache[id];
  }

  const LazyComponent = React.lazy(async () => {
    const extensionImport = await importExtension(extensionName);
    const widgetGroup: WidgetGroup = extensionImport.default[groupName];
    const item = widgetGroup.items.find(item => item.type === widgetType);
    if (!item) {
      throw new Error(`Widget ${id} not found`);
    }
    return { default: item.component };
  });

  componentCache[id] = LazyComponent;
  return LazyComponent;
}

export class WidgetErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="widget-error p-4 bg-red-50 text-red-500 rounded">
          Failed to load widget: {this.state.error?.message || "Unknown error"}
        </div>
      );
    }
    return this.props.children;
  }
}

const WidgetFallback = () => {
  return (
    <div className="widget-fallback p-4 bg-gray-50 text-gray-500 rounded">
      Failed to load widget
    </div>
  );
};

export const SuspenseWidget = ({
  extensionName,
  groupName,
  widgetType,
  queryClient,
  callbacks,
}: {
  extensionName: ExtensionName;
  groupName: string;
  widgetType: "oneByOne" | "twoByOne" | "twoByTwo" | "full";
  queryClient: QueryClient;
  callbacks: {
    onMaximize?: () => void;
    onMinimize?: () => void;
  };
}) => {
  const LazyWidget = getLazyWidget(extensionName, groupName, widgetType);

  const props = {
    queryClient,
    ...(widgetType.includes("full") ? { onMinimize: callbacks.onMinimize } : {}),
    ...(widgetType.includes("2x2") && widgetType.includes("transcript")
      ? { onMaximize: callbacks.onMaximize }
      : {}),
  };

  return (
    <WidgetErrorBoundary>
      <Suspense fallback={<WidgetFallback />}>
        <LazyWidget {...props as any} />
      </Suspense>
    </WidgetErrorBoundary>
  );
};

// Define types for our widget configuration
interface WidgetConfig {
  id: string;
  extensionName: ExtensionName;
  groupName: string;
  widgetType: "oneByOne" | "twoByOne" | "twoByTwo" | "full";
}

interface LayoutConfig {
  widgets: WidgetConfig[];
  layouts: Layout[];
}

const defaultConfig: LayoutConfig = {
  widgets: [
    {
      id: "1",
      extensionName: "@hypr/extension-dino-game",
      groupName: "chromeDino",
      widgetType: "twoByOne",
    },
    {
      id: "2",
      extensionName: "@hypr/extension-summary",
      groupName: "bullet",
      widgetType: "twoByTwo",
    },
    {
      id: "3",
      extensionName: "@hypr/extension-transcript",
      groupName: "default",
      widgetType: "twoByTwo",
    },
  ],
  layouts: [
    { i: "1", x: 0, y: 0, w: 2, h: 1 },
    { i: "2", x: 0, y: 1, w: 2, h: 2 },
    { i: "3", x: 0, y: 3, w: 2, h: 2 },
  ],
};

export default function WidgetRenderer({
  config = defaultConfig,
}: {
  config?: LayoutConfig;
}) {
  const queryClient = useQueryClient();

  const [layout, setLayout] = useState<Layout[]>(config.layouts);
  const [showFull, setShowFull] = useState(false);
  const [fullWidgetConfig, setFullWidgetConfig] = useState<WidgetConfig | null>(null);

  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setLayout(newLayout);
  }, []);

  const handleMaximize = useCallback((widgetConfig: WidgetConfig) => {
    setFullWidgetConfig(widgetConfig);
    setShowFull(true);
  }, []);

  const handleMinimize = useCallback(() => {
    setShowFull(false);
    setFullWidgetConfig(null);
  }, []);

  return (
    <>
      {showFull && fullWidgetConfig
        ? (
          <SuspenseWidget
            extensionName={fullWidgetConfig.extensionName}
            groupName={fullWidgetConfig.groupName}
            widgetType="full"
            queryClient={queryClient}
            callbacks={{ onMinimize: handleMinimize }}
          />
        )
        : (
          <GridLayout
            layout={layout}
            cols={2}
            rowHeight={160}
            width={380}
            margin={[20, 20]}
            onLayoutChange={handleLayoutChange}
            isDraggable={true}
            isResizable={false}
            compactType="vertical"
            draggableCancel=".not-draggable"
          >
            {config.widgets.map(widget => (
              <div key={widget.id}>
                <SuspenseWidget
                  extensionName={widget.extensionName}
                  groupName={widget.groupName}
                  widgetType={widget.widgetType}
                  queryClient={queryClient}
                  callbacks={{
                    ...(widget.widgetType === "twoByTwo" && widget.extensionName === "@hypr/extension-transcript"
                      ? { onMaximize: () => handleMaximize(widget) }
                      : {}),
                  }}
                />
              </div>
            ))}
          </GridLayout>
        )}
    </>
  );
}

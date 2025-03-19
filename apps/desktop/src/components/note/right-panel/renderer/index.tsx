import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { QueryClient, useQueryClient } from "@tanstack/react-query";
import React, { Suspense, useCallback, useEffect, useState } from "react";
import GridLayout, { Layout } from "react-grid-layout";

import type { WidgetGroup, WidgetType } from "@hypr/extension-utils";
import { ExtensionName, importExtension } from "./extensions";

const componentCache: Record<string, React.LazyExoticComponent<any>> = {};

function getLazyWidget(widgetConfig: WidgetConfig): React.LazyExoticComponent<any> {
  const id = getID(widgetConfig);
  if (componentCache[id]) {
    return componentCache[id];
  }

  const LazyComponent = React.lazy(async () => {
    const extensionImport = await importExtension(widgetConfig.extensionName);
    const widgetGroup: WidgetGroup = extensionImport.default[widgetConfig.groupName];
    const item = widgetGroup.items.find(item => item.type === widgetConfig.widgetType);
    if (!item) {
      throw new Error(`Widget ${id} not found`);
    }
    return { default: item.component };
  });

  componentCache[id] = LazyComponent;
  return LazyComponent;
}

export const SuspenseWidget = ({
  widgetConfig,
  queryClient,
  callbacks,
}: {
  widgetConfig: WidgetConfig;
  queryClient: QueryClient;
  callbacks: {
    onMaximize?: () => void;
    onMinimize?: () => void;
  };
}) => {
  const LazyWidget = getLazyWidget(widgetConfig);
  const { widgetType } = widgetConfig;

  const props = {
    queryClient,
    ...(widgetType === "full" ? { onMinimize: callbacks.onMinimize } : {}),
    ...(widgetType !== "full" && callbacks.onMaximize ? { onMaximize: callbacks.onMaximize } : {}),
  };

  return (
    <Suspense fallback={<div>loading...</div>}>
      <LazyWidget {...props as any} />
    </Suspense>
  );
};

export interface WidgetConfig {
  extensionName: ExtensionName;
  groupName: string;
  widgetType: WidgetType;
  layout?: Omit<Layout, "i" | "w" | "h">;
}

const getID = (widget: WidgetConfig) => `${widget.extensionName}-${widget.groupName}-${widget.widgetType}`;

export default function WidgetRenderer({ widgets }: { widgets: WidgetConfig[] }) {
  const initialLayout = widgets.map((w) => {
    if (!w.layout) return null;
    const size = w.widgetType === "oneByOne"
      ? { w: 1, h: 1 }
      : w.widgetType === "twoByOne"
      ? { w: 2, h: 1 }
      : { w: 2, h: 2 };

    return { ...w.layout, i: getID(w), ...size };
  }).filter((l) => !!l);

  const queryClient = useQueryClient();
  const [layout, setLayout] = useState<Layout[]>(initialLayout);
  const [showFull, setShowFull] = useState(false);
  const [fullWidgetConfig, setFullWidgetConfig] = useState<WidgetConfig | null>(null);
  const [widgetsWithFullVersion, setWidgetsWithFullVersion] = useState<Record<string, boolean>>({});

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

  const getFullWidgetConfig = useCallback((baseConfig: WidgetConfig): WidgetConfig => {
    return {
      ...baseConfig,
      widgetType: "full",
    };
  }, []);

  const hasFullWidgetForGroup = useCallback(async (extensionName: ExtensionName, groupName: string) => {
    const extensionImport = await importExtension(extensionName);
    const widgetGroup: WidgetGroup = extensionImport.default[groupName];

    return widgetGroup.items.some(item => item.type === "full");
  }, []);

  useEffect(() => {
    const checkFullWidgets = async () => {
      const results: Record<string, boolean> = {};

      for (const widget of widgets) {
        const key = getID(widget);
        if (!results[key]) {
          results[key] = await hasFullWidgetForGroup(widget.extensionName, widget.groupName);
        }
      }

      setWidgetsWithFullVersion(results);
    };

    checkFullWidgets();
  }, [widgets, hasFullWidgetForGroup]);

  return (
    <>
      {showFull && fullWidgetConfig
        ? (
          <SuspenseWidget
            widgetConfig={getFullWidgetConfig(fullWidgetConfig)}
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
            {widgets.map(widget => (
              <div key={getID(widget)}>
                <SuspenseWidget
                  widgetConfig={widget}
                  queryClient={queryClient}
                  callbacks={{
                    ...(widget.widgetType !== "full" && widgetsWithFullVersion[getID(widget)]
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

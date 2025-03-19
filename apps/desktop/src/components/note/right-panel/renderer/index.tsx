import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import GridLayout, { Layout } from "react-grid-layout";

import { ExtensionName, importExtension } from "./extensions";
import { getID, getSize, SuspenseWidget, WidgetConfig } from "./widgets";

export type { WidgetConfig };

export default function WidgetRenderer({ widgets }: { widgets: WidgetConfig[] }) {
  const queryClient = useQueryClient();
  const [layout, setLayout] = useState<Layout[]>(
    widgets
      .map((w) => {
        if (!w.layout) return null;
        const size = getSize(w.widgetType);
        return { ...w.layout, i: getID(w), ...size };
      })
      .filter(Boolean) as Layout[],
  );

  const [showFull, setShowFull] = useState(false);
  const [fullWidgetConfig, setFullWidgetConfig] = useState<WidgetConfig | null>(null);
  const [widgetsWithFullVersion, setWidgetsWithFullVersion] = useState<Record<string, boolean>>({});

  const hasFullWidgetForGroup = useCallback(
    async (extensionName: ExtensionName, groupName: string): Promise<boolean> => {
      const extensionImport = await importExtension(extensionName);
      const widgetGroup = extensionImport.default.widgetGroups.find(({ id }) => id === groupName);
      return !!widgetGroup?.items.some(({ type }) => type === "full");
    },
    [],
  );

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

  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setLayout(newLayout);
  }, []);

  const getFullWidgetConfig = useMemo(() => (baseConfig: WidgetConfig): WidgetConfig => ({
    ...baseConfig,
    widgetType: "full",
  }), []);

  const toggleFullWidget = useCallback((widgetConfig: WidgetConfig | null) => {
    setFullWidgetConfig(widgetConfig);
    setShowFull(!!widgetConfig);
  }, []);

  const handleMaximize = useCallback((widgetConfig: WidgetConfig) => {
    toggleFullWidget(widgetConfig);
  }, [toggleFullWidget]);

  const handleMinimize = useCallback(() => {
    toggleFullWidget(null);
  }, [toggleFullWidget]);

  if (showFull && fullWidgetConfig) {
    return (
      <SuspenseWidget
        widgetConfig={getFullWidgetConfig(fullWidgetConfig)}
        queryClient={queryClient}
        callbacks={{ onMinimize: handleMinimize }}
      />
    );
  }

  return (
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
            callbacks={widget.widgetType !== "full" && widgetsWithFullVersion[getID(widget)]
              ? { onMaximize: () => handleMaximize(widget) }
              : {}}
          />
        </div>
      ))}
    </GridLayout>
  );
}

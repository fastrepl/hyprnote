import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import GridLayout, { Layout } from "react-grid-layout";
import { AnimatePresence, motion } from "motion/react";

import { ExtensionName, importExtension } from "@hypr/extension-registry";
import { getID, getSize, SuspenseWidget, WidgetConfig } from "./widgets";

export type { WidgetConfig };

interface WidgetRendererProps {
  widgets: WidgetConfig[];
  handleUpdateLayout: (layout: Pick<Layout, "x" | "y" | "i">[]) => void;
}

export default function WidgetRenderer({ widgets, handleUpdateLayout }: WidgetRendererProps) {
  const queryClient = useQueryClient();

  const layout = useMemo(() => {
    return widgets
      .map((w) => ({ ...(w.layout ?? { x: 0, y: 0 }), i: getID(w), ...getSize(w.widgetType) }));
  }, [widgets]);

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
    handleUpdateLayout(newLayout.map(({ i, x, y }) => ({
      x,
      y,
      i,
    })));
  }, []);

  const getFullWidgetConfig = useMemo(() => (baseConfig: WidgetConfig): WidgetConfig => ({
    ...baseConfig,
    widgetType: "full",
  }), []);

  const toggleFullWidget = useCallback((widgetConfig: WidgetConfig | null) => {
    if (widgetConfig) {
      setFullWidgetConfig(widgetConfig);
      // Small delay to ensure smooth transition
      setTimeout(() => {
        setShowFull(true);
      }, 10);
    } else {
      setShowFull(false);
      // Delay clearing the widget config to allow the animation to complete
      setTimeout(() => {
        setFullWidgetConfig(null);
      }, 300);
    }
  }, []);

  const handleMaximize = useCallback((widgetConfig: WidgetConfig) => {
    toggleFullWidget(widgetConfig);
  }, [toggleFullWidget]);

  const handleMinimize = useCallback(() => {
    toggleFullWidget(null);
  }, [toggleFullWidget]);

  return (
    <div className="relative w-full h-full">
      <AnimatePresence mode="wait">
        {showFull && fullWidgetConfig ? (
          <motion.div
            key="full-widget"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.25,
              ease: "easeInOut"
            }}
            className="absolute inset-0 z-10"
          >
            <SuspenseWidget
              widgetConfig={getFullWidgetConfig(fullWidgetConfig)}
              queryClient={queryClient}
              callbacks={{ onMinimize: handleMinimize }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="grid-layout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.25,
              ease: "easeInOut"
            }}
            className="w-full h-full"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

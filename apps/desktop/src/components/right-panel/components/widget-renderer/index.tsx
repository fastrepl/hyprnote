import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { Trans } from "@lingui/react/macro";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMatch } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import GridLayout, { Layout } from "react-grid-layout";

import { ExtensionName, importExtension } from "@hypr/extension-registry";
import { commands as windowsCommands } from "@hypr/plugin-windows";

import { ConfigureWidgetsButton } from "./configure-widgets-button";
import { getID, getSize, SuspenseWidget, type WidgetConfig } from "./widgets";

export type { WidgetConfig };

interface WidgetRendererProps {
  widgets: WidgetConfig[];
  handleUpdateLayout: (layout: Pick<Layout, "x" | "y" | "i">[]) => void;
}

export default function WidgetRenderer({
  widgets,
  handleUpdateLayout,
}: WidgetRendererProps) {
  const queryClient = useQueryClient();
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });

  const layout = useMemo(() => {
    return widgets.map((w) => ({
      ...(w.layout ?? { x: 0, y: 0 }),
      i: getID(w),
      ...getSize(w.widgetType),
    }));
  }, [widgets]);

  const [showFull, setShowFull] = useState(false);
  const [fullWidgetConfig, setFullWidgetConfig] = useState<WidgetConfig | null>(
    null,
  );
  const [widgetsWithFullVersion, setWidgetsWithFullVersion] = useState<
    Record<string, boolean>
  >({});

  const isSettingsVisible = useQuery({
    queryKey: ["is-settings-visible"],
    queryFn: () => windowsCommands.windowIsVisible({ type: "settings" }),
    refetchInterval: 1000,
  });

  const hasFullWidgetForGroup = useCallback(
    async (
      extensionName: ExtensionName,
      groupName: string,
    ): Promise<boolean> => {
      const extensionImport = await importExtension(extensionName);
      const widgetGroup = extensionImport.default.widgetGroups.find(
        ({ id }) => id === groupName,
      );
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
          results[key] = await hasFullWidgetForGroup(
            widget.extensionName,
            widget.groupName,
          );
        }
      }

      setWidgetsWithFullVersion(results);
    };

    checkFullWidgets();
  }, [widgets, hasFullWidgetForGroup]);

  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    handleUpdateLayout(
      newLayout.map(({ i, x, y }) => ({
        x,
        y,
        i,
      })),
    );
  }, []);

  const getFullWidgetConfig = useMemo(
    () => (baseConfig: WidgetConfig): WidgetConfig => ({
      ...baseConfig,
      widgetType: "full",
    }),
    [],
  );

  const toggleFullWidget = useCallback((widgetConfig: WidgetConfig | null) => {
    if (widgetConfig) {
      setFullWidgetConfig(widgetConfig);

      setTimeout(() => {
        setShowFull(true);
      }, 10);
    } else {
      setShowFull(false);

      setTimeout(() => {
        setFullWidgetConfig(null);
      }, 300);
    }
  }, []);

  const handleMaximize = useCallback(
    (widgetConfig: WidgetConfig) => {
      toggleFullWidget(widgetConfig);
    },
    [toggleFullWidget],
  );

  const handleMinimize = useCallback(() => {
    toggleFullWidget(null);
  }, [toggleFullWidget]);

  if (!noteMatch) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-neutral-500">
          Widgets are only available in note view.
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-y-auto scrollbar-none">
      <AnimatePresence mode="wait">
        {showFull && fullWidgetConfig
          ? (
            <motion.div
              key="full-widget"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.25,
                ease: "easeInOut",
              }}
              className="absolute inset-0 z-10 flex items-center justify-center bg-background dark:bg-background"
            >
              <SuspenseWidget
                widgetConfig={getFullWidgetConfig(fullWidgetConfig)}
                queryClient={queryClient}
                callbacks={{ onMinimize: handleMinimize }}
              />
            </motion.div>
          )
          : (
            <motion.div
              key="grid-layout"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.25,
                ease: "easeInOut",
              }}
              className="text-foreground dark:text-foreground"
            >
              <GridLayout
                layout={layout}
                cols={2}
                rowHeight={160}
                width={380}
                margin={[20, 20]}
                onLayoutChange={handleLayoutChange}
                isDraggable={!!isSettingsVisible.data}
                isResizable={false}
                compactType="vertical"
                draggableCancel=".not-draggable"
              >
                {widgets.map((widget) => (
                  <div key={getID(widget)}>
                    <SuspenseWidget
                      widgetConfig={widget}
                      queryClient={queryClient}
                      callbacks={widget.widgetType !== "full"
                          && widgetsWithFullVersion[getID(widget)]
                        ? { onMaximize: () => handleMaximize(widget) }
                        : {}}
                    />
                  </div>
                ))}
              </GridLayout>

              <div className="flex items-center justify-center mb-5">
                <ConfigureWidgetsButton>
                  <Trans>Edit Widgets</Trans>
                </ConfigureWidgetsButton>
              </div>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}

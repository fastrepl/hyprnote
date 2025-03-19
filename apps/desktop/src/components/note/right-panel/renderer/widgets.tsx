import { QueryClient } from "@tanstack/react-query";
import React from "react";
import type { Layout } from "react-grid-layout";

import type { WidgetType } from "@hypr/extension-utils";
import { ExtensionName, importExtension } from "./extensions";

const componentCache: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {};

function getLazyWidget(widgetConfig: WidgetConfig): React.LazyExoticComponent<React.ComponentType<any>> {
  const id = getID(widgetConfig);
  if (componentCache[id]) {
    return componentCache[id];
  }

  const LazyComponent = React.lazy(async () => {
    try {
      const extensionImport = await importExtension(widgetConfig.extensionName);

      const widgetGroup = extensionImport.default.widgetGroups.find(({ id }) => id === widgetConfig.groupName);
      const item = widgetGroup?.items.find(({ type }) => type === widgetConfig.widgetType);

      if (!item || !item.component) {
        throw new Error(
          `Widget ${widgetConfig.widgetType} not found in ${widgetConfig.extensionName}/${widgetConfig.groupName}`,
        );
      }

      return { default: item.component };
    } catch (error) {
      console.error(`Failed to load widget: ${getID(widgetConfig)}`, error);
      return {
        default: () => <div className="widget-error">Failed to load widget</div>,
      };
    }
  });

  componentCache[id] = LazyComponent;
  return LazyComponent;
}

interface SuspenseWidgetProps {
  widgetConfig: WidgetConfig;
  queryClient: QueryClient;
  callbacks: {
    onMaximize?: () => void;
    onMinimize?: () => void;
  };
}

export function SuspenseWidget({
  widgetConfig,
  queryClient,
  callbacks,
}: SuspenseWidgetProps) {
  const LazyWidget = getLazyWidget(widgetConfig);
  const { widgetType } = widgetConfig;

  const widgetProps = {
    queryClient,
    widgetConfig,
    ...(widgetType === "full" ? { onMinimize: callbacks.onMinimize } : {}),
    ...(widgetType !== "full" && callbacks.onMaximize ? { onMaximize: callbacks.onMaximize } : {}),
  };

  return (
    <React.Suspense fallback={<div className="widget-loading">Loading...</div>}>
      <LazyWidget {...widgetProps} />
    </React.Suspense>
  );
}

export interface WidgetConfig {
  extensionName: ExtensionName;
  groupName: string;
  widgetType: WidgetType;
  layout?: Omit<Layout, "i" | "w" | "h"> | null;
}

export const getID = (widget: WidgetConfig) => `${widget.extensionName}-${widget.groupName}-${widget.widgetType}`;

export const getSize = (widgetType: WidgetType) => {
  switch (widgetType) {
    case "oneByOne":
      return { w: 1, h: 1 };
    case "twoByOne":
      return { w: 2, h: 1 };
    default:
      return { w: 2, h: 2 };
  }
};

import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { SuspenseWidget } from "@/components/right-panel/components/widget-renderer/widgets";
import { useHypr } from "@/contexts";
import {
  EXTENSION_CONFIGS,
  type ExtensionName,
  importExtension,
} from "@hypr/extension-registry";
import type { Extension } from "@hypr/extension-types";
import {
  commands as dbCommands,
  type ExtensionDefinition,
  type ExtensionMapping,
  type ExtensionWidgetKind,
} from "@hypr/plugin-db";
import {
  commands as windowsCommands,
  events as windowsEvents,
} from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";

interface ExtensionsComponentProps {
  selectedExtension: ExtensionDefinition | null;
  onExtensionSelect: (extension: ExtensionDefinition | null) => void;
}

export default function Extensions({
  selectedExtension,
  onExtensionSelect,
}: ExtensionsComponentProps) {
  const { userId } = useHypr();
  const queryClient = useQueryClient();
  const [extensionInView, setExtensionInView] = useState<Extension | null>(
    null
  );

  useEffect(() => {
    windowsCommands.windowResizeDefault({ type: "main" }).then(() => {
      windowsCommands.windowPosition({ type: "main" }, "right-half");
      windowsEvents.mainWindowState.emit({
        left_sidebar_expanded: false,
        right_panel_expanded: true,
      });
    });

    return () => {
      windowsEvents.mainWindowState.emit({
        left_sidebar_expanded: true,
        right_panel_expanded: false,
      });
    };
  }, []);

  useEffect(() => {
    if (selectedExtension?.id) {
      importExtension(selectedExtension.id as ExtensionName).then((module) => {
        setExtensionInView(module.default);
      });
    }
  }, [selectedExtension]);

  const extension = useQuery({
    enabled: !!selectedExtension?.id,
    queryKey: ["extension-mapping", selectedExtension?.id],
    queryFn: () =>
      dbCommands.getExtensionMapping(userId, selectedExtension?.id!),
  });

  const toggleWidgetInsideExtensionGroup = useMutation({
    mutationFn: async (args: {
      groupId: string;
      widgetKind: ExtensionWidgetKind;
    }) => {
      const widgets = extension.data?.widgets.find(
        (widget) => widget.group === args.groupId
      )
        ? extension.data?.widgets.filter(
            (widget) => widget.group !== args.groupId
          )
        : [
            ...(extension.data?.widgets ?? []),
            { group: args.groupId, kind: args.widgetKind, position: null },
          ];

      const mapping: ExtensionMapping = {
        id: extension.data?.id ?? crypto.randomUUID(),
        user_id: userId,
        extension_id: selectedExtension?.id!,
        config: {},
        widgets,
      };
      await dbCommands.upsertExtensionMapping(mapping);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["extensions"] });
      await queryClient.refetchQueries({
        queryKey: ["extension-mapping", selectedExtension?.id],
      });
      await windowsCommands.windowShow({ type: "main" });
    },
  });

  const implementedExtensions = useMemo(
    () => EXTENSION_CONFIGS.filter((ext) => ext.implemented),
    []
  );

  useEffect(() => {
    if (!selectedExtension && implementedExtensions.length > 0) {
      onExtensionSelect(implementedExtensions[0]);
      return;
    }

    if (
      selectedExtension &&
      !selectedExtension.implemented &&
      implementedExtensions.length > 0
    ) {
      onExtensionSelect(implementedExtensions[0]);
    }
  }, [selectedExtension, onExtensionSelect, implementedExtensions]);

  if (!selectedExtension) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4 text-neutral-700">
          Extensions
        </h2>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200">
          <p className="text-neutral-500">
            <Trans>Loading extension details...</Trans>
          </p>
        </div>
      </div>
    );
  }

  const hasMultipleGroups =
    extensionInView?.widgetGroups && extensionInView.widgetGroups.length > 1;

  return (
    <div className="flex flex-col gap-4">
      <div className={hasMultipleGroups ? "border-b pb-4 border-border" : ""}>
        <h3 className="text-2xl font-semibold text-neutral-700 mb-2">
          {selectedExtension.title}
        </h3>

        {/* Display configComponent if it exists */}
        {extensionInView?.configComponent && (
          <div className="mb-8">{extensionInView.configComponent}</div>
        )}

        {/* Display widget groups */}
        {extensionInView?.widgetGroups.map((group) => (
          <RenderGroup
            key={group.id}
            group={group}
            handler={toggleWidgetInsideExtensionGroup.mutate}
            activeWidgets={extension.data?.widgets || []}
            extensionId={selectedExtension.id as ExtensionName}
          />
        ))}
      </div>
    </div>
  );
}

function RenderGroup({
  group,
  handler,
  activeWidgets,
  extensionId,
}: {
  group: Extension["widgetGroups"][number];
  handler: (args: any) => void;
  activeWidgets: ExtensionMapping["widgets"];
  extensionId: ExtensionName;
}) {
  const queryClient = useQueryClient();
  const isWidgetActive = (groupId: string, widgetKind: ExtensionWidgetKind) => {
    return activeWidgets.some(
      (widget) => widget.group === groupId && widget.kind === widgetKind
    );
  };

  return (
    <div className="mb-4">
      {group.items.map((item) => (
        <div key={item.type as string} className="relative">
          {item.type === "oneByOne" && (
            <div
              className="group relative"
              style={{ width: "160px", height: "160px" }}
            >
              <div className="pointer-events-none w-full h-full overflow-hidden rounded-2xl">
                <SuspenseWidget
                  widgetConfig={{
                    extensionName: extensionId,
                    groupName: group.id,
                    widgetType: item.type as ExtensionWidgetKind,
                    layout: null,
                  }}
                  queryClient={queryClient}
                  callbacks={{}}
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/5 backdrop-blur-sm rounded-2xl">
                <Button
                  variant={
                    isWidgetActive(group.id, item.type as ExtensionWidgetKind)
                      ? "destructive"
                      : "default"
                  }
                  size="sm"
                  onClick={() =>
                    handler({ groupId: group.id, widgetKind: item.type })
                  }
                  className="font-medium"
                >
                  {isWidgetActive(group.id, item.type as ExtensionWidgetKind)
                    ? "Remove"
                    : "Add"}
                </Button>
              </div>
            </div>
          )}
          {item.type === "twoByOne" && (
            <div
              className="group relative"
              style={{ width: "340px", height: "160px" }}
            >
              <div className="pointer-events-none w-full h-full overflow-hidden rounded-2xl">
                <SuspenseWidget
                  widgetConfig={{
                    extensionName: extensionId,
                    groupName: group.id,
                    widgetType: item.type as ExtensionWidgetKind,
                    layout: null,
                  }}
                  queryClient={queryClient}
                  callbacks={{}}
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/5 backdrop-blur-sm rounded-2xl">
                <Button
                  variant={
                    isWidgetActive(group.id, item.type as ExtensionWidgetKind)
                      ? "destructive"
                      : "default"
                  }
                  size="sm"
                  onClick={() =>
                    handler({ groupId: group.id, widgetKind: item.type })
                  }
                  className="font-medium"
                >
                  {isWidgetActive(group.id, item.type as ExtensionWidgetKind)
                    ? "Remove"
                    : "Add"}
                </Button>
              </div>
            </div>
          )}
          {item.type === "twoByTwo" && (
            <div
              className="group relative"
              style={{ width: "340px", height: "340px" }}
            >
              <div className="pointer-events-none w-full h-full overflow-hidden rounded-2xl">
                <SuspenseWidget
                  widgetConfig={{
                    extensionName: extensionId,
                    groupName: group.id,
                    widgetType: item.type as ExtensionWidgetKind,
                    layout: null,
                  }}
                  queryClient={queryClient}
                  callbacks={{}}
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/5 backdrop-blur-sm rounded-2xl">
                <Button
                  variant={
                    isWidgetActive(group.id, item.type as ExtensionWidgetKind)
                      ? "destructive"
                      : "default"
                  }
                  size="sm"
                  onClick={() =>
                    handler({ groupId: group.id, widgetKind: item.type })
                  }
                  className="font-medium"
                >
                  {isWidgetActive(group.id, item.type as ExtensionWidgetKind)
                    ? "Remove"
                    : "Add"}
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

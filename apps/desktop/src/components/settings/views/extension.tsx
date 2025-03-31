import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { useHypr } from "@/contexts";
import { EXTENSION_CONFIGS, type ExtensionName, importExtension } from "@hypr/extension-registry";
import {
  commands as dbCommands,
  type ExtensionDefinition,
  type ExtensionMapping,
  type ExtensionWidgetKind,
} from "@hypr/plugin-db";
import { commands as windowsCommands, events as windowsEvents } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import { WidgetOneByOneWrapper, WidgetTwoByOneWrapper, WidgetTwoByTwoWrapper } from "@hypr/ui/components/ui/widgets";

interface ExtensionsComponentProps {
  selectedExtension: ExtensionDefinition | null;
  onExtensionSelect: (extension: ExtensionDefinition | null) => void;
}

type ExtensionData = {
  id: string;
  groups: {
    id: string;
    types: string[];
  }[];
};

export default function Extensions({ selectedExtension, onExtensionSelect }: ExtensionsComponentProps) {
  const { userId } = useHypr();
  const queryClient = useQueryClient();
  const [extensionData, setExtensionData] = useState<ExtensionData | null>(null);

  useEffect(() => {
    windowsCommands.windowResizeDefault({ type: "main" }).then(() => {
      windowsCommands.windowPosition({ type: "main" }, "right-half");
      windowsEvents.mainWindowState.emit({ left_sidebar_expanded: false, right_panel_expanded: true });
    });

    return () => {
      windowsEvents.mainWindowState.emit({ left_sidebar_expanded: true, right_panel_expanded: false });
    };
  }, []);

  useEffect(() => {
    if (selectedExtension?.id) {
      importExtension(selectedExtension.id as ExtensionName).then((module) => {
        const groups = module.default.widgetGroups.map((group) => ({
          id: group.id,
          types: group.items.map((item) => item.type).filter((type) => type !== "full"),
        }));

        setExtensionData({
          id: selectedExtension.id,
          groups,
        });
      });
    }
  }, [selectedExtension]);

  const extension = useQuery({
    enabled: !!selectedExtension?.id,
    queryKey: ["extension-mapping", selectedExtension?.id],
    queryFn: () => dbCommands.getExtensionMapping(userId, selectedExtension?.id!),
  });

  const toggleWidgetInsideExtensionGroup = useMutation({
    mutationFn: async (args: { groupId: string; widgetKind: ExtensionWidgetKind }) => {
      const widgets = extension.data?.widgets.find((widget) => widget.group === args.groupId)
        ? extension.data?.widgets.filter((widget) => widget.group !== args.groupId)
        : [...(extension.data?.widgets ?? []), { group: args.groupId, kind: args.widgetKind, position: null }];

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
      await queryClient.refetchQueries({ queryKey: ["extension-mapping", selectedExtension?.id] });
      await windowsCommands.windowShow({ type: "main" });
    },
  });

  const implementedExtensions = useMemo(() => EXTENSION_CONFIGS.filter((ext) => ext.implemented), []);

  useEffect(() => {
    if (!selectedExtension && implementedExtensions.length > 0) {
      onExtensionSelect(implementedExtensions[0]);
      return;
    }

    if (selectedExtension && !selectedExtension.implemented && implementedExtensions.length > 0) {
      onExtensionSelect(implementedExtensions[0]);
    }
  }, [selectedExtension, onExtensionSelect, implementedExtensions]);

  if (!selectedExtension) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4 text-neutral-700">Extensions</h2>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200">
          <p className="text-neutral-500">
            <Trans>Loading extension details...</Trans>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border-b pb-4 border-border">
        <h3 className="text-2xl font-semibold text-neutral-700 mb-2">{selectedExtension.title}</h3>
        {extensionData?.groups.map((group) => (
          <RenderGroup
            key={group.id}
            group={group}
            handler={toggleWidgetInsideExtensionGroup.mutate}
            activeWidgets={extension.data?.widgets || []}
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
}: {
  group: ExtensionData["groups"][number];
  handler: (args: any) => void;
  activeWidgets: ExtensionMapping["widgets"];
}) {
  const isWidgetActive = (groupId: string, widgetKind: ExtensionWidgetKind) => {
    return activeWidgets.some((widget) => widget.group === groupId && widget.kind === widgetKind);
  };

  return (
    <div className="mb-4">
      <h4 className="text-sm font-medium mb-2">
        <Trans>Group {group.id}</Trans>
      </h4>

      <div>
        {group.types.map((type: Omit<ExtensionWidgetKind, "full">) => (
          <div key={type as string} className="relative">
            {type === "oneByOne" && (
              <WidgetOneByOneWrapper className="group relative">
                <div className="flex items-center justify-center h-full text-neutral-600">Example 1×1</div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/5 backdrop-blur-sm">
                  <Button
                    variant={isWidgetActive(group.id, type as ExtensionWidgetKind) ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handler({ groupId: group.id, widgetKind: type })}
                    className="font-medium"
                  >
                    {isWidgetActive(group.id, type as ExtensionWidgetKind) ? "Remove" : "Add"}
                  </Button>
                </div>
              </WidgetOneByOneWrapper>
            )}
            {type === "twoByOne" && (
              <WidgetTwoByOneWrapper className="group relative">
                <div className="flex items-center justify-center h-full text-neutral-600">Example 2×1</div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/5 backdrop-blur-sm">
                  <Button
                    variant={isWidgetActive(group.id, type as ExtensionWidgetKind) ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handler({ groupId: group.id, widgetKind: type })}
                    className="font-medium"
                  >
                    {isWidgetActive(group.id, type as ExtensionWidgetKind) ? "Remove" : "Add"}
                  </Button>
                </div>
              </WidgetTwoByOneWrapper>
            )}
            {type === "twoByTwo" && (
              <WidgetTwoByTwoWrapper className="group relative">
                <div className="flex items-center justify-center h-full text-neutral-600">Example 2×2</div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/5 backdrop-blur-sm">
                  <Button
                    variant={isWidgetActive(group.id, type as ExtensionWidgetKind) ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handler({ groupId: group.id, widgetKind: type })}
                    className="font-medium"
                  >
                    {isWidgetActive(group.id, type as ExtensionWidgetKind) ? "Remove" : "Add"}
                  </Button>
                </div>
              </WidgetTwoByTwoWrapper>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
